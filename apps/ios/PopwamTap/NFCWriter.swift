import CoreNFC
import Foundation

enum PopwamNFCOperation {
    case read(expectedURL: URL?)
    case write(permanentURL: URL)
    case lock(permanentURL: URL, irreversibleConfirmation: Bool)
}

enum PopwamNFCResult: Equatable {
    case verified(URL)
    case writtenAndVerified(URL)
    case locked(URL)
    case failed(String)
}

/// Native iOS NDEF boundary. Activation codes are deliberately not accepted by
/// this API: callers can provide only the permanent public URL.
final class NFCWriter: NSObject, NFCNDEFReaderSessionDelegate {
    private var session: NFCNDEFReaderSession?
    private var operation: PopwamNFCOperation?
    private var completion: ((PopwamNFCResult) -> Void)?

    func begin(_ operation: PopwamNFCOperation, completion: @escaping (PopwamNFCResult) -> Void) {
        guard NFCNDEFReaderSession.readingAvailable else {
            completion(.failed("NFC_UNAVAILABLE")); return
        }
        if case .lock(_, let confirmed) = operation, !confirmed {
            completion(.failed("IRREVERSIBLE_CONFIRMATION_REQUIRED")); return
        }
        self.operation = operation
        self.completion = completion
        let session = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: false)
        session.alertMessage = "Hold your iPhone near the NFC tag."
        self.session = session
        session.begin()
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        completion?(.failed("NFC_SESSION_ENDED")); completion = nil
    }

    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {}

    func readerSession(_ session: NFCNDEFReaderSession, didDetect tags: [NFCNDEFTag]) {
        guard tags.count == 1, let tag = tags.first, let operation else {
            session.alertMessage = "Present exactly one NFC tag."
            session.restartPolling(); return
        }
        session.connect(to: tag) { [weak self] error in
            guard let self else { return }
            if error != nil { self.finish(.failed("NFC_CONNECT_FAILED")); return }
            tag.queryNDEFStatus { status, capacity, error in
                if error != nil || status == .notSupported { self.finish(.failed("NDEF_UNSUPPORTED")); return }
                switch operation {
                case .read(let expected): self.readAndVerify(tag, expected: expected, success: .verified)
                case .write(let url):
                    guard status == .readWrite else { self.finish(.failed("TAG_READ_ONLY")); return }
                    self.write(tag, url: url, capacity: capacity, lockAfterWrite: false)
                case .lock(let url, _):
                    guard status == .readWrite else { self.finish(.failed("LOCK_UNSUPPORTED")); return }
                    self.readAndVerify(tag, expected: url) { verifiedURL in
                        tag.writeLock { error in self.finish(error == nil ? .locked(verifiedURL) : .failed("LOCK_FAILED")) }
                    }
                }
            }
        }
    }

    private func write(_ tag: NFCNDEFTag, url: URL, capacity: Int, lockAfterWrite: Bool) {
        guard let payload = NFCNDEFPayload.wellKnownTypeURIPayload(url: url) else { finish(.failed("URL_INVALID")); return }
        let message = NFCNDEFMessage(records: [payload])
        guard message.length <= capacity else { finish(.failed("TAG_TOO_SMALL")); return }
        tag.writeNDEF(message) { [weak self] error in
            guard let self else { return }
            if error != nil { self.finish(.failed("WRITE_FAILED")); return }
            self.readAndVerify(tag, expected: url, success: .writtenAndVerified)
        }
    }

    private func readAndVerify(_ tag: NFCNDEFTag, expected: URL?, success: @escaping (URL) -> PopwamNFCResult) {
        tag.readNDEF { [weak self] message, error in
            guard let self else { return }
            guard error == nil, let record = message?.records.first, let url = record.wellKnownTypeURIPayload() else { self.finish(.failed("NDEF_URL_MISSING")); return }
            guard expected == nil || expected?.absoluteString == url.absoluteString else { self.finish(.failed("URL_MISMATCH")); return }
            self.finish(success(url))
        }
    }

    private func finish(_ result: PopwamNFCResult) {
        session?.alertMessage = result == .failed("URL_MISMATCH") ? "The tag contains a different URL." : "NFC operation finished."
        session?.invalidate(); completion?(result); completion = nil; operation = nil
    }
}
