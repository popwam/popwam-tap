# POPWAM Tap iOS NFC module

This directory contains the native Core NFC implementation boundary for the future iOS target. It intentionally does not use Web NFC and never writes an activation code. The host iOS app must add the Near Field Communication Tag Reading capability, `NFCReaderUsageDescription`, Universal/URL-scheme handling for `popwamtap://`, signing, and API authentication in Xcode on macOS.

The Windows repository verification cannot produce an iOS archive. The Swift sources are ready to be integrated into the signed iOS application target and then tested with writable NDEF tags on a real compatible iPhone.
