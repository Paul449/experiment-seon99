package expo.modules.mymodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.URL

class MyModule : Module() {
 
    Name("MyModule")
    Function("hello") : String {
        return "Hello world! 👋"
    }
    View(MyModuleView::class) {
      // Defines a setter for the `url` prop.
      Prop("url") { view: MyModuleView, url: URL ->
        view.webView.loadUrl(url.toString())
      }
     
    
  }
}
