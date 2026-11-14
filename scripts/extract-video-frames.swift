import Foundation
import AVFoundation
import AppKit

// Local visual review only. Keep the original video and its overlays intact.
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let asset = AVURLAsset(url: input)
let seconds = CMTimeGetSeconds(asset.duration)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 1280, height: 1280)
var records: [[String: Any]] = []
for index in 0..<24 {
    let time = max(0, min(seconds - 0.1, Double(index) * seconds / 24))
    var actual = CMTime.zero
    let frame = try generator.copyCGImage(at: CMTime(seconds: time, preferredTimescale: 600), actualTime: &actual)
    let image = NSBitmapImageRep(cgImage: frame)
    let filename = String(format: "frame-%02d.jpg", index)
    try image.representation(using: .jpeg, properties: [.compressionFactor: 0.94])!.write(to: output.appendingPathComponent(filename))
    records.append(["file": filename, "seconds": CMTimeGetSeconds(actual), "width": frame.width, "height": frame.height])
}
try JSONSerialization.data(withJSONObject: ["duration": seconds, "source": input.lastPathComponent, "frames": records], options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("frames.json"))
print("Reviewed \(input.lastPathComponent): \(seconds) seconds, \(records.count) frames")
