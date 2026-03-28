import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let buildDirectory = root.appendingPathComponent("build", isDirectory: true)
let iconsetDirectory = buildDirectory.appendingPathComponent("iconset.iconset", isDirectory: true)

let iconSizes: [(name: String, pixels: Int)] = [
  ("icon_16x16.png", 16),
  ("icon_16x16@2.png", 32),
  ("icon_32x32.png", 32),
  ("icon_32x32@2.png", 64),
  ("icon_48x48.png", 48),
  ("icon_128x128.png", 128),
  ("icon_128x128@2.png", 256),
  ("icon_256x256.png", 256),
  ("icon_256x256@2.png", 512),
  ("icon_512x512.png", 512),
  ("icon_512x512@2.png", 1024),
]

func color(red: CGFloat, green: CGFloat, blue: CGFloat, alpha: CGFloat = 1) -> NSColor {
  NSColor(calibratedRed: red / 255, green: green / 255, blue: blue / 255, alpha: alpha)
}

func makeRoundedRectPath(_ rect: NSRect, radius: CGFloat) -> NSBezierPath {
  NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
}

func fillRoundedRect(_ rect: NSRect, radius: CGFloat, colors: [NSColor], angle: CGFloat) {
  let path = makeRoundedRectPath(rect, radius: radius)
  let gradient = NSGradient(colors: colors)!
  gradient.draw(in: path, angle: angle)
}

func drawIcon(into context: CGContext, size: CGFloat) {
  let canvas = NSRect(x: 0, y: 0, width: size, height: size)
  context.clear(canvas)

  let margin = size * 0.07
  let iconRect = canvas.insetBy(dx: margin, dy: margin)
  let radius = size * 0.215

  context.saveGState()
  let shadow = NSShadow()
  shadow.shadowBlurRadius = size * 0.03
  shadow.shadowOffset = NSSize(width: 0, height: -(size * 0.012))
  shadow.shadowColor = color(red: 185, green: 197, blue: 216, alpha: 0.28)
  shadow.set()
  fillRoundedRect(
    iconRect,
    radius: radius,
    colors: [
      color(red: 254, green: 254, blue: 255),
      color(red: 239, green: 244, blue: 251),
    ],
    angle: -90,
  )
  context.restoreGState()

  fillRoundedRect(
    iconRect.insetBy(dx: size * 0.006, dy: size * 0.006),
    radius: radius - (size * 0.006),
    colors: [
      color(red: 255, green: 255, blue: 255, alpha: 0.7),
      color(red: 255, green: 255, blue: 255, alpha: 0.08),
    ],
    angle: -90,
  )

  color(red: 220, green: 229, blue: 241, alpha: 0.95).setStroke()
  let border = makeRoundedRectPath(iconRect.insetBy(dx: size * 0.003, dy: size * 0.003), radius: radius - (size * 0.003))
  border.lineWidth = max(1, size * 0.006)
  border.stroke()

  let faceColor = color(red: 35, green: 46, blue: 73)
  faceColor.setFill()

  let eyeRadius = size * 0.036
  let eyeCenterY = iconRect.midY + size * 0.045
  let leftEyeCenter = NSPoint(x: iconRect.midX - iconRect.width * 0.14, y: eyeCenterY)
  let rightEyeCenter = NSPoint(x: iconRect.midX + iconRect.width * 0.14, y: eyeCenterY)

  NSBezierPath(ovalIn: NSRect(x: leftEyeCenter.x - eyeRadius, y: leftEyeCenter.y - eyeRadius, width: eyeRadius * 2, height: eyeRadius * 2)).fill()
  NSBezierPath(ovalIn: NSRect(x: rightEyeCenter.x - eyeRadius, y: rightEyeCenter.y - eyeRadius, width: eyeRadius * 2, height: eyeRadius * 2)).fill()

  let bridgeHeight = max(2, size * 0.016)
  let bridgeRect = NSRect(
    x: leftEyeCenter.x + eyeRadius * 0.55,
    y: eyeCenterY - bridgeHeight / 2,
    width: (rightEyeCenter.x - leftEyeCenter.x) - eyeRadius * 1.1,
    height: bridgeHeight,
  )
  let bridge = makeRoundedRectPath(bridgeRect, radius: bridgeHeight / 2)
  bridge.fill()

  let cheekColor = color(red: 255, green: 192, blue: 196, alpha: 0.95)
  cheekColor.setFill()
  let cheekSize = NSSize(width: size * 0.085, height: size * 0.055)
  let cheekY = iconRect.midY - size * 0.14
  let leftCheekRect = NSRect(x: iconRect.midX - iconRect.width * 0.26 - cheekSize.width / 2, y: cheekY - cheekSize.height / 2, width: cheekSize.width, height: cheekSize.height)
  let rightCheekRect = NSRect(x: iconRect.midX + iconRect.width * 0.26 - cheekSize.width / 2, y: cheekY - cheekSize.height / 2, width: cheekSize.width, height: cheekSize.height)
  NSBezierPath(ovalIn: leftCheekRect).fill()
  NSBezierPath(ovalIn: rightCheekRect).fill()
}

func renderIcon(size: Int) throws -> Data {
  let width = size
  let height = size
  guard
    let bitmap = NSBitmapImageRep(
      bitmapDataPlanes: nil,
      pixelsWide: width,
      pixelsHigh: height,
      bitsPerSample: 8,
      samplesPerPixel: 4,
      hasAlpha: true,
      isPlanar: false,
      colorSpaceName: .deviceRGB,
      bitmapFormat: [],
      bytesPerRow: 0,
      bitsPerPixel: 0
    )
  else {
    throw NSError(domain: "icon-generation", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unable to allocate bitmap"])
  }

  bitmap.size = NSSize(width: width, height: height)

  guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    throw NSError(domain: "icon-generation", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unable to create graphics context"])
  }

  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = context
  context.cgContext.setAllowsAntialiasing(true)
  context.cgContext.setShouldAntialias(true)
  drawIcon(into: context.cgContext, size: CGFloat(size))
  context.flushGraphics()
  NSGraphicsContext.restoreGraphicsState()

  guard let data = bitmap.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "icon-generation", code: 3, userInfo: [NSLocalizedDescriptionKey: "Unable to encode PNG"])
  }

  return data
}

func write(_ data: Data, to url: URL) throws {
  try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try data.write(to: url)
}

func runIconutil() throws {
  let process = Process()
  process.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
  process.arguments = ["--convert", "icns", "--output", buildDirectory.appendingPathComponent("icon.icns").path, iconsetDirectory.path]
  try process.run()
  process.waitUntilExit()

  guard process.terminationStatus == 0 else {
    throw NSError(domain: "icon-generation", code: 4, userInfo: [NSLocalizedDescriptionKey: "iconutil failed"])
  }
}

do {
  try FileManager.default.createDirectory(at: buildDirectory, withIntermediateDirectories: true)
  try FileManager.default.createDirectory(at: iconsetDirectory, withIntermediateDirectories: true)

  for icon in iconSizes {
    let data = try renderIcon(size: icon.pixels)
    try write(data, to: iconsetDirectory.appendingPathComponent(icon.name))
    if icon.pixels == 1024 {
      try write(data, to: buildDirectory.appendingPathComponent("app-icon.png"))
    }
  }

  try runIconutil()
  print("Generated macOS icon assets in \(buildDirectory.path)")
} catch {
  fputs("Failed to generate macOS icon assets: \(error)\n", stderr)
  exit(1)
}
