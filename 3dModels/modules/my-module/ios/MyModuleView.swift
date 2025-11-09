import ExpoModulesCore
import SceneKit

final class MyModuleView: ExpoView {
  private let sceneView = SCNView()
  let onLoad = EventDispatcher()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    sceneView.backgroundColor = .clear
    sceneView.autoenablesDefaultLighting = true
    sceneView.allowsCameraControl = true
    sceneView.defaultCameraController.interactionMode = .orbitTurntable
    addSubview(sceneView)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    sceneView.frame = bounds
  }

  func updateModel(atPath path: String?) {
    guard let path else {
      sceneView.scene = nil
      onLoad(["url": ""])
      return
    }

    let url: URL
    if path.hasPrefix("file://") || path.hasPrefix("http") {
      guard let resolvedURL = URL(string: path) else {
        onLoad(["error": "Invalid URL: \(path)"])
        return
      }
      url = resolvedURL
    } else {
      url = URL(fileURLWithPath: path)
    }

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let scene = try SCNScene(url: url, options: nil)
        DispatchQueue.main.async {
          self.sceneView.scene = scene
          self.onLoad(["url": url.absoluteString])
        }
      } catch {
        DispatchQueue.main.async {
          self.sceneView.scene = nil
          self.onLoad(["error": error.localizedDescription])
        }
      }
    }
  }
}
