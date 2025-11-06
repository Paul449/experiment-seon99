import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Function("hello") { () -> String in
      return "Hello from Swift! 👋"
    }

    View(MyModuleView.self) {
      Events("onLoad")
      
      Prop("url") { (view: MyModuleView, url: URL) in
        view.webView.load(URLRequest(url: url))
      }
    }
  }
}
