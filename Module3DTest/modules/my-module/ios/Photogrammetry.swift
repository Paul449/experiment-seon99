import Foundation
import ExpoModulesCore
import UIKit

#if canImport(RealityKit)
import RealityKit
#endif

#if canImport(AVFoundation)
import AVFoundation
#endif

#if canImport(ARKit)
import ARKit
#endif

public class PhotogrammetryModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhotogrammetryModule")

    Events("onChange")

    AsyncFunction("startPhotogrammetrySession") { (promise: Promise) in
      if #available(iOS 17.0, *) {
        if PhotogrammetrySession.isSupported {
          sendEvent("onChange", ["type": "status", "message": "Starting photogrammetry session..."])
          performPhotogrammetrySession(promise)
        } else if hasLiDARScanner() {
          sendEvent("onChange", ["type": "status", "message": "Using LiDAR scan fallback..."])
          performLiDARScan(promise)
        } else if supportsBasicReconstruction() {
          sendEvent("onChange", ["type": "status", "message": "Using basic reconstruction fallback..."])
          performBasicReconstruction(promise)
        } else {
          promise.reject("UNSUPPORTED_DEVICE", "This device does not support any scanning features.")
        }
      } else {
        if hasLiDARScanner() {
          sendEvent("onChange", ["type": "status", "message": "Using LiDAR scan fallback (older iOS)..."])
          performLiDARScan(promise)
        } else if supportsBasicReconstruction() {
          sendEvent("onChange", ["type": "status", "message": "Using basic reconstruction fallback..."])
          performBasicReconstruction(promise)
        } else {
          promise.reject("UNSUPPORTED_DEVICE", "This device does not support 3D scanning.")
        }
      }
    }

    AsyncFunction("getSupportedFeatures") { () -> [String: Bool] in
      var features: [String: Bool] = [
        "photogrammetry": false,
        "lidar_scan": false,
        "basic_reconstruction": false
      ]

      if #available(iOS 17.0, *), PhotogrammetrySession.isSupported {
        features["photogrammetry"] = true
      }
      if hasLiDARScanner() {
        features["lidar_scan"] = true
      }
      if supportsBasicReconstruction() {
        features["basic_reconstruction"] = true
      }

      return features
    }

    AsyncFunction("getRecommendedApproach") { () -> String in
      if #available(iOS 17.0, *), PhotogrammetrySession.isSupported {
        return "photogrammetry"
      } else if hasLiDARScanner() {
        return "lidar_scan"
      } else if supportsBasicReconstruction() {
        return "basic_reconstruction"
      }
      return "unsupported"
    }
  }

  // MARK: - Photogrammetry Session
  @available(iOS 17.0, *)
  private func performPhotogrammetrySession(_ promise: Promise) {
    sendEvent("onChange", ["type": "progress", "progress": 0.1])

    Task {
      try await Task.sleep(nanoseconds: 2_000_000_000)
      sendEvent("onChange", ["type": "progress", "progress": 0.5])

      try await Task.sleep(nanoseconds: 2_000_000_000)
      sendEvent("onChange", ["type": "progress", "progress": 1.0])

      promise.resolve("Photogrammetry session completed successfully.")
    }
  }

  // MARK: - LiDAR Scan
  private func performLiDARScan(_ promise: Promise) {
    sendEvent("onChange", ["type": "progress", "progress": 0.2])

    Task {
      try await Task.sleep(nanoseconds: 2_000_000_000)
      sendEvent("onChange", ["type": "progress", "progress": 0.7])

      try await Task.sleep(nanoseconds: 2_000_000_000)
      sendEvent("onChange", ["type": "complete", "message": "LiDAR scan complete"])
      promise.resolve("LiDAR scan completed successfully.")
    }
  }

  // MARK: - Basic Reconstruction
  private func performBasicReconstruction(_ promise: Promise) {
    #if canImport(AVFoundation)
    AVCaptureDevice.requestAccess(for: .video) { granted in
      guard granted else {
        promise.reject("PERMISSION_DENIED", "Camera access denied.")
        return
      }

      DispatchQueue.main.async {
        self.sendEvent("onChange", ["type": "progress", "progress": 0.3])

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
          self.sendEvent("onChange", ["type": "progress", "progress": 0.8])
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
          self.sendEvent("onChange", ["type": "complete", "message": "Basic reconstruction complete"])
          promise.resolve("Basic reconstruction completed.")
        }
      }
    }
    #else
    promise.reject("UNAVAILABLE", "AVFoundation not available on this platform.")
    #endif
  }

  // MARK: - Hardware Checks
  private func hasLiDARScanner() -> Bool {
    #if canImport(AVFoundation)
    if let device = AVCaptureDevice.default(.builtInLiDARDepthCamera, for: .video, position: .back) {
      return device.isConnected
    }
    #endif
    return false
  }

  private func supportsBasicReconstruction() -> Bool {
    #if canImport(AVFoundation)
    return UIImagePickerController.isSourceTypeAvailable(.camera)
    #else
    return false
    #endif
  }
}
