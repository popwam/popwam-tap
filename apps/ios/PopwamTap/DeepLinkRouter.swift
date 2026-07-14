import Foundation

enum PopwamDeepLink: Equatable {
    case writeTag(String)
    case testTag(String)

    init?(url: URL) {
        guard url.scheme == "popwamtap", let host = url.host else { return nil }
        let id = url.pathComponents.dropFirst().first ?? ""
        guard !id.isEmpty else { return nil }
        switch host {
        case "write-tag": self = .writeTag(id)
        case "test-tag": self = .testTag(id)
        default: return nil
        }
    }
}
