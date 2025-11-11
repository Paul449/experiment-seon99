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
//create a section to define 3d module application
// class name: PhotogrammetryHelper, protocol: Module
public class PhotogrammetryHelper: Module {
   /* step 1: develop setup*/
   //Create photogrammetry session
   public func definition() -> ModuleDefinition{
      //module name
      name("PhotogrammetryHelper");
      //input sources
      
   }
   //connect output stream
}