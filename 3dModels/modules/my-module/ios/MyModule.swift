import ExpoModulesCore
import Foundation
import os

#if os(macOS)
import RealityKit
#endif

public final class MyModule: Module {
  private let logger = Logger(subsystem: "com.apple.sample.photogrammetry",
                              category: "ExpoPhotogrammetry")

#if os(macOS)
  @available(macOS 12.0, *)
  private var session: PhotogrammetrySession?
  @available(macOS 12.0, *)
  private var waiter: Task<Void, Never>?
  @available(macOS 12.0, *)
  private var continuation: CheckedContinuation<String, Error>?
#endif

  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Constant("PI") {
      Double.pi
    }

    Events("onChange", "onProgress", "onLog", "onError")

    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }

#if os(macOS)
    AsyncFunction("processPhotogrammetry") { (options: PhotogrammetryOptions) -> String in
      if #available(macOS 12.0, *) {
        return try await self.processPhotogrammetry(options: options)
      } else {
        throw PhotogrammetryError.notSupported
      }
    }

    Function("cancelPhotogrammetry") {
      if #available(macOS 12.0, *) {
        self.cancelProcessing()
      }
    }
#else
    AsyncFunction("processPhotogrammetry") { (_: PhotogrammetryOptions) -> String in
      throw PhotogrammetryError.notSupported
    }

    Function("cancelPhotogrammetry") {}
#endif

    View(MyModuleView.self) {
      Prop("url") { (view: MyModuleView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      Events("onLoad")
    }
  }

#if os(macOS)
  @available(macOS 12.0, *)
  private func processPhotogrammetry(options: PhotogrammetryOptions) async throws -> String {
    guard continuation == nil else {
      throw PhotogrammetryError.processingInProgress
    }

    guard PhotogrammetrySession.isSupported else {
      emit("onError", ["message": PhotogrammetryError.notSupported.localizedDescription])
      throw PhotogrammetryError.notSupported
    }

    let inputFolderUrl = URL(fileURLWithPath: options.inputFolder, isDirectory: true)
    let configuration = try makeConfiguration(from: options)
    logger.log("Using configuration: \(String(describing: configuration))")

    let session = try PhotogrammetrySession(input: inputFolderUrl, configuration: configuration)
    logger.log("Successfully created session.")
    self.session = session

    return try await withCheckedThrowingContinuation { continuation in
      self.continuation = continuation

      waiter = Task { [weak self] in
        guard let self else { return }
        do {
          for try await output in session.outputs {
            self.handleSessionOutput(output)
          }
        } catch {
          self.handleSessionError(error)
        }
      }

      Task { [weak self] in
        guard let self else { return }
        do {
          let request = try self.makeRequest(from: options)
          self.logger.log("Using request: \(String(describing: request))")
          try session.process(requests: [request])
        } catch {
          self.handleSessionError(error)
        }
      }
    }
  }

  @available(macOS 12.0, *)
  private func handleSessionOutput(_ output: PhotogrammetrySession.Output) {
    switch output {
      case .processingComplete:
        logger.log("Processing is complete!")
        emit("onLog", ["message": "Processing complete."])
      case .requestError(let request, let error):
        logger.error("Request \(String(describing: request)) had an error: \(String(describing: error))")
        handleSessionError(error)
      case .requestComplete(_, let result):
        handleRequestResult(result)
      case .requestProgress(let request, let fractionComplete):
        logger.log("Progress(request = \(String(describing: request)) = \(fractionComplete)")
        emit("onProgress", [
          "fractionComplete": fractionComplete,
          "request": String(describing: request)
        ])
      case .inputComplete:
        logger.log("Data ingestion is complete. Beginning processing...")
        emit("onLog", ["message": "Input ingestion complete."])
      case .invalidSample(let id, let reason):
        logger.warning("Invalid Sample! id=\(id)  reason=\"\(reason)\"")
        emit("onLog", ["message": "Invalid sample \(id): \(reason)"])
      case .skippedSample(let id):
        logger.warning("Sample id=\(id) was skipped by processing.")
        emit("onLog", ["message": "Sample \(id) skipped."])
      case .automaticDownsampling:
        logger.warning("Automatic downsampling was applied!")
        emit("onLog", ["message": "Automatic downsampling applied."])
      case .processingCancelled:
        logger.warning("Processing was cancelled.")
        emit("onError", ["message": "Processing cancelled."])
        clearSession(shouldCancel: false)
        resumeContinuationIfNeeded(.failure(PhotogrammetryError.processingCancelled))
      case .requestProgressInfo(_, let progressInfo):
        logger.log("Progress Request Received. Time remaining: \(progressInfo.estimatedRemainingTime.debugDescription)")
        if let remaining = progressInfo.estimatedRemainingTime {
          emit("onLog", ["message": "Estimated time remaining: \(remaining)"])
        }
      case .stitchingIncomplete:
        logger.warning("Received stitching incomplete message.")
        emit("onLog", ["message": "Stitching incomplete."])
      @unknown default:
        logger.error("Output: unhandled message: \(output.localizedDescription)")
        emit("onLog", ["message": output.localizedDescription])
    }
  }

  @available(macOS 12.0, *)
  private func handleRequestResult(_ result: PhotogrammetrySession.Result) {
    switch result {
      case .modelFile(let url):
        logger.log("Model file available at url=\(url)")
        emit("onLog", ["message": "Model file created at \(url.path)"])
        resumeContinuationIfNeeded(.success(url.path))
        clearSession(shouldCancel: false)
      default:
        logger.warning("Unexpected result: \(String(describing: result))")
        emit("onError", ["message": "Unexpected result: \(result)"])
        clearSession(shouldCancel: true)
        resumeContinuationIfNeeded(.failure(PhotogrammetryError.unexpectedResult))
    }
  }

  @available(macOS 12.0, *)
  private func handleSessionError(_ error: Error) {
    logger.error("Session error: \(String(describing: error))")
    emit("onError", ["message": String(describing: error)])
    clearSession(shouldCancel: true)
    resumeContinuationIfNeeded(.failure(error))
  }

  @available(macOS 12.0, *)
  private func resumeContinuationIfNeeded(_ result: Result<String, Error>) {
    guard let continuation else { return }
    self.continuation = nil
    continuation.resume(with: result)
  }

  @available(macOS 12.0, *)
  private func clearSession(shouldCancel: Bool) {
    if shouldCancel {
      session?.cancel()
    }
    waiter?.cancel()
    waiter = nil
    session = nil
  }

  @available(macOS 12.0, *)
  private func cancelProcessing() {
    guard continuation != nil else { return }
    emit("onError", ["message": "Processing cancelled by user."])
    clearSession(shouldCancel: true)
    resumeContinuationIfNeeded(.failure(PhotogrammetryError.processingCancelled))
  }

  @available(macOS 12.0, *)
  private func makeConfiguration(from options: PhotogrammetryOptions) throws -> PhotogrammetrySession.Configuration {
    var configuration = PhotogrammetrySession.Configuration()
    if let ordering = options.sampleOrdering {
      configuration.sampleOrdering = try parseSampleOrdering(ordering)
    }
    if let sensitivity = options.featureSensitivity {
      configuration.featureSensitivity = try parseFeatureSensitivity(sensitivity)
    }
    return configuration
  }

  @available(macOS 12.0, *)
  private func makeRequest(from options: PhotogrammetryOptions) throws -> PhotogrammetrySession.Request {
    let outputUrl = URL(fileURLWithPath: options.outputFile)
    if let detailValue = options.detail {
      let detail = try parseDetail(detailValue)
      return PhotogrammetrySession.Request.modelFile(url: outputUrl, detail: detail)
    } else {
      return PhotogrammetrySession.Request.modelFile(url: outputUrl)
    }
  }

  @available(macOS 12.0, *)
  private func parseDetail(_ value: String) throws -> PhotogrammetrySession.Request.Detail {
    switch value {
      case "preview": return .preview
      case "reduced": return .reduced
      case "medium": return .medium
      case "full": return .full
      case "raw": return .raw
      default: throw PhotogrammetryError.invalidDetail(value)
    }
  }

  @available(macOS 12.0, *)
  private func parseSampleOrdering(_ value: String) throws -> PhotogrammetrySession.Configuration.SampleOrdering {
    switch value {
      case "unordered": return .unordered
      case "sequential": return .sequential
      default: throw PhotogrammetryError.invalidSampleOrdering(value)
    }
  }

  @available(macOS 12.0, *)
  private func parseFeatureSensitivity(_ value: String) throws -> PhotogrammetrySession.Configuration.FeatureSensitivity {
    switch value {
      case "normal": return .normal
      case "high": return .high
      default: throw PhotogrammetryError.invalidFeatureSensitivity(value)
    }
  }

  private func emit(_ name: String, _ payload: [String: Any]) {
    DispatchQueue.main.async {
      self.sendEvent(name, payload)
    }
  }
#endif
}

struct PhotogrammetryOptions: Record {
  @Field var inputFolder: String
  @Field var outputFile: String
  @Field var detail: String?
  @Field var sampleOrdering: String?
  @Field var featureSensitivity: String?
}

enum PhotogrammetryError: Error, LocalizedError {
  case notSupported
  case invalidDetail(String)
  case invalidSampleOrdering(String)
  case invalidFeatureSensitivity(String)
  case processingInProgress
  case processingCancelled
  case unexpectedResult

  var errorDescription: String? {
    switch self {
      case .notSupported:
        return "Object Capture is not available on this device."
      case .invalidDetail(let value):
        return "Invalid detail option: \(value)"
      case .invalidSampleOrdering(let value):
        return "Invalid sample ordering option: \(value)"
      case .invalidFeatureSensitivity(let value):
        return "Invalid feature sensitivity option: \(value)"
      case .processingInProgress:
        return "A photogrammetry session is already running."
      case .processingCancelled:
        return "The photogrammetry session was cancelled."
      case .unexpectedResult:
        return "The photogrammetry session produced an unexpected result."
    }
  }
}
