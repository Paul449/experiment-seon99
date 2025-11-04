//File handling, example(URL: File paths)
import Foundation;
//import Photogrammetry library
import Photogrammetry;
// to work with 3D models like USDZ or obj
import RealityKit;
//Creating session for developing 3D models from photos
public class Photogrammetry: Module{
    //Creating a session from a set of images or default values
    convenience init(){
        //accepts images from a directory
        input: URL,
        //configuration for the session
        configuration:PhotogrammetrySession.Configuration = Configuration(),
        throws: Error
    }
    //check if actually hardware supports photogrammetry(iphone 12 and above or Ipad)
    static func isSupported() -> Bool{
        return PhotogrammetrySession.isSupported
    }
    //configure session
    var configuration: PhotogrammetrySession.Configuration{
        get{
            return self.configuration
        }
        set(newConfiguration){
            self.configuration = newConfiguration
        }
    }
    print("configuration", configuration);
}