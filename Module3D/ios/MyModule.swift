import ExpoModulesCore

public class MyModule: Module {
 
    Name("MyModule")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      return "Hello world! 👋"
    }
    // Enables the module to be used as a native view. Definition components that are accepted as part of the
    // view definition: Prop, Events.
    View(MyModuleView.self) {
      // Defines a setter for the `url` prop.
      Prop("url") { (view: MyModuleView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      
    }
  }
}
