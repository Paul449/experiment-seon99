import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")
    
    print("🔵 [Swift] MyModule loaded!")
    
    Function("hello") {
      print("🔵 [Swift] hello() function called!")
      return "Hello from Swift! 👋"
    }
    
    View(MyModuleView.self) {
      print("🔵 [Swift] MyModuleView created!")
    }
  }
}

