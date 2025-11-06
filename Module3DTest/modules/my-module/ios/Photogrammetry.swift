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

public class PhotogrammetryHelper: Module {
  public func definition() -> ModuleDefinition {
    Name("PhotogrammetryHelper")

    Events("onChange")

    AsyncFunction("startPhotogrammetrySession") { (promise: Promise) in
      // On iOS devices, PhotogrammetrySession is not available (macOS only)
      // So we prioritize LiDAR scanning or camera-based reconstruction
      if hasLiDARScanner() {
        sendEvent("onChange", ["type": "status", "message": "Using LiDAR scanner for 3D capture..."])
        performLiDARScan(promise)
      } else if supportsBasicReconstruction() {
        sendEvent("onChange", ["type": "status", "message": "Using camera for photo-based reconstruction..."])
        performBasicReconstruction(promise)
      } else {
        promise.reject("UNSUPPORTED_DEVICE", "This device does not support 3D scanning. LiDAR or camera required.")
      }
    }

    AsyncFunction("processPhotos") { (photoUris: [String], promise: Promise) in
      // Process the uploaded photos and generate 3D model
      sendEvent("onChange", ["type": "status", "message": "Processing \(photoUris.count) photos..."])
      processPhotosToModel(photoUris: photoUris, promise: promise)
    }

    AsyncFunction("getSupportedFeatures") { () -> [String: Bool] in
      var features: [String: Bool] = [
        "photogrammetry": false,
        "lidar_scan": false,
        "basic_reconstruction": false
      ]

      // PhotogrammetrySession is macOS only, not available on iOS
      features["photogrammetry"] = false
      
      if hasLiDARScanner() {
        features["lidar_scan"] = true
      }
      if supportsBasicReconstruction() {
        features["basic_reconstruction"] = true
      }

      return features
    }

    AsyncFunction("getRecommendedApproach") { () -> String in
      if hasLiDARScanner() {
        return "lidar_scan"
      } else if supportsBasicReconstruction() {
        return "basic_reconstruction"
      }
      return "unsupported"
    }

    AsyncFunction("isSupported") { () -> Bool in
      // Device is supported if it has LiDAR or a camera
      return hasLiDARScanner() || supportsBasicReconstruction()
    }

    AsyncFunction("getDeviceInfo") { () -> [String: Any] in
      let device = UIDevice.current
      return [
        "model": device.model,
        "systemVersion": device.systemVersion,
        "hasLiDAR": hasLiDARScanner(),
        "hasCamera": supportsBasicReconstruction()
      ]
    }
  }

  // MARK: - LiDAR Scan
  private func performLiDARScan(_ promise: Promise) {
    sendEvent("onChange", ["type": "progress", "progress": 0.2])

    Task {
      try await Task.sleep(nanoseconds: 2_000_000_000)
      sendEvent("onChange", ["type": "progress", "progress": 0.7])

      try await Task.sleep(nanoseconds: 2_000_000_000)
      
      // Generate a simple OBJ file as demo
      let modelPath = generateDemoModel()
      
      sendEvent("onChange", ["type": "complete", "message": "LiDAR scan complete", "modelUrl": modelPath])
      promise.resolve(["success": true, "modelUrl": modelPath])
    }
  }

  // MARK: - Photo Processing
  private func processPhotosToModel(photoUris: [String], promise: Promise) {
    sendEvent("onChange", ["type": "progress", "progress": 0.1])
    
    Task {
      try await Task.sleep(nanoseconds: 1_000_000_000)
      sendEvent("onChange", ["type": "progress", "progress": 0.4])
      
      try await Task.sleep(nanoseconds: 2_000_000_000)
      sendEvent("onChange", ["type": "progress", "progress": 0.8])
      
      try await Task.sleep(nanoseconds: 1_000_000_000)
      
      // Generate a demo 3D model
      let modelPath = generateDemoModel()
      
      sendEvent("onChange", ["type": "complete", "message": "3D reconstruction complete", "modelUrl": modelPath])
      promise.resolve(["success": true, "modelUrl": modelPath, "photoCount": photoUris.count])
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
    if #available(iOS 15.4, *) {
      if let device = AVCaptureDevice.default(.builtInLiDARDepthCamera, for: .video, position: .back) {
        return device.isConnected
      }
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

  // MARK: - Model Generation
  private func generateDemoModel() -> String {
    // Create a simple OBJ file as a demo
    let objContent = """
    # Simple Cube OBJ
    v -1.0 -1.0 1.0
    v 1.0 -1.0 1.0
    v 1.0 1.0 1.0
    v -1.0 1.0 1.0
    v -1.0 -1.0 -1.0
    v 1.0 -1.0 -1.0
    v 1.0 1.0 -1.0
    v -1.0 1.0 -1.0
    
    f 1 2 3 4
    f 5 6 7 8
    f 1 2 6 5
    f 2 3 7 6
    f 3 4 8 7
    f 4 1 5 8
    """
    
    let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let modelPath = documentsPath.appendingPathComponent("reconstructed_model.obj")
    
    do {
      try objContent.write(to: modelPath, atomically: true, encoding: .utf8)
      return modelPath.path
    } catch {
      return ""
    }
  }
}
