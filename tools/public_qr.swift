import Foundation
import CoreImage
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count == 3 else { exit(2) }
let value = CommandLine.arguments[1]
guard value.range(of: "^https://[a-z0-9-]+\\.trycloudflare\\.com$", options: .regularExpression) != nil,
      let filter = CIFilter(name: "CIQRCodeGenerator") else { exit(3) }
filter.setValue(Data(value.utf8), forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
guard let code = filter.outputImage else { exit(4) }
let bounds = code.extent.insetBy(dx: -4, dy: -4)
let white = CIImage(color: CIColor(red: 1, green: 1, blue: 1)).cropped(to: bounds)
let qr = code.composited(over: white).transformed(by: CGAffineTransform(scaleX: 12, y: 12))
let context = CIContext()
guard let cg = context.createCGImage(qr, from: qr.extent),
      let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[2]) as CFURL, "public.png" as CFString, 1, nil) else { exit(5) }
CGImageDestinationAddImage(destination, cg, nil)
guard CGImageDestinationFinalize(destination) else { exit(6) }
// Round-trip decode the actual PNG, including its quiet zone.
guard let image = CIImage(contentsOf: URL(fileURLWithPath: CommandLine.arguments[2])),
      let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: context,
                               options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]),
      detector.features(in: image).contains(where: { ($0 as? CIQRCodeFeature)?.messageString == value }) else { exit(7) }
print("QR_GENERATED_AND_DECODED")
