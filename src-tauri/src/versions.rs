//! Minecraft version id -> Java requirement logic.
//!
//! Kept free of external dependencies so it can be unit-tested on its own.
//! The version JSON published by Mojang (`javaVersion.majorVersion`) is always
//! preferred; these heuristics only apply before that metadata is available
//! (for example when a Forge/NeoForge installer needs a runtime) and must
//! still behave for snapshots, pre-releases and pre-1.0 ids.

/// Java major version a Minecraft version id needs.
pub fn required_java_major(version_id: &str, declared: Option<u32>) -> u32 {
    if let Some(major) = declared {
        return major;
    }
    if let Some((year, week)) = parse_snapshot(version_id) {
        // Weekly snapshots: 21w19a moved to Java 16, 21w44a to 17, 24w14a to 21.
        // Year 26+ snapshots follow the new year-based release numbering.
        return if year >= 26 { 25 }
        else if (year, week) >= (24, 14) { 21 }
        else if (year, week) >= (21, 44) { 17 }
        else if (year, week) >= (21, 19) { 16 }
        else { 8 };
    }
    let base = version_id.split('-').next().unwrap_or(version_id);
    let parts: Vec<u32> = base.split('.').map_while(|part| part.parse().ok()).collect();
    match parts.first().copied() {
        // 26.x and later use year-based numbering and require Java 25.
        Some(major) if major >= 26 => 25,
        Some(1) => {
            let minor = parts.get(1).copied().unwrap_or(0);
            let patch = parts.get(2).copied().unwrap_or(0);
            if minor <= 16 { 8 }
            else if minor == 17 { 16 }
            else if minor >= 21 || (minor == 20 && patch >= 5) { 21 }
            else { 17 }
        }
        // Alpha/beta/classic ids ("b1.7.3", "a1.2.6", "rd-132211", "c0.30") and anything unknown.
        _ => 8,
    }
}

/// `24w14a` -> `(24, 14)`. Returns `None` for any other id shape.
fn parse_snapshot(version_id: &str) -> Option<(u32, u32)> {
    let (year, rest) = version_id.split_once('w')?;
    if year.len() != 2 || !year.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let digits: String = rest.chars().take_while(char::is_ascii_digit).collect();
    if digits.len() != 2 || !rest[digits.len()..].chars().all(|c| c.is_ascii_lowercase()) {
        return None;
    }
    Some((year.parse().ok()?, digits.parse().ok()?))
}

/// Whether an installed runtime can run a version that needs `required`.
/// Legacy versions only run on Java 8 (LaunchWrapper and old Forge break on 9+);
/// newer ones also accept the next LTS that Mojang and the loaders support.
pub fn java_satisfies(runtime_major: u32, required: u32) -> bool {
    match required {
        0..=8 => runtime_major == 8,
        16 => runtime_major == 16 || runtime_major == 17,
        17 => runtime_major == 17 || runtime_major == 21,
        _ => runtime_major == required,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn declared_value_wins() {
        assert_eq!(required_java_major("1.7.10", Some(21)), 21);
    }

    #[test]
    fn releases() {
        for (id, java) in [
            ("1.7.10", 8), ("1.12.2", 8), ("1.16.5", 8), ("1.17", 16), ("1.17.1", 16),
            ("1.18.2", 17), ("1.20.1", 17), ("1.20.4", 17), ("1.20.5", 21), ("1.20.6", 21),
            ("1.21", 21), ("1.21.4", 21), ("1.21.11", 21), ("26.1", 25), ("26.1.2", 25),
        ] {
            assert_eq!(required_java_major(id, None), java, "{id}");
        }
    }

    #[test]
    fn prereleases_follow_their_release() {
        assert_eq!(required_java_major("1.21.4-pre1", None), 21);
        assert_eq!(required_java_major("1.20.5-rc2", None), 21);
        assert_eq!(required_java_major("1.16.5-rc1", None), 8);
        assert_eq!(required_java_major("26.1-snapshot-1", None), 25);
    }

    #[test]
    fn snapshots() {
        for (id, java) in [
            ("20w51a", 8), ("21w18a", 8), ("21w19a", 16), ("21w43a", 16), ("21w44a", 17),
            ("23w51b", 17), ("24w13a", 17), ("24w14a", 21), ("25w02a", 21), ("26w01a", 25),
        ] {
            assert_eq!(required_java_major(id, None), java, "{id}");
        }
    }

    #[test]
    fn legacy_ids() {
        for id in ["b1.7.3", "a1.2.6", "rd-132211", "c0.30_01c", "3D Shareware v1.34"] {
            assert_eq!(required_java_major(id, None), 8, "{id}");
        }
    }

    #[test]
    fn compatibility() {
        assert!(java_satisfies(8, 8));
        assert!(!java_satisfies(17, 8));
        assert!(java_satisfies(17, 16));
        assert!(java_satisfies(21, 17));
        assert!(!java_satisfies(8, 17));
        assert!(java_satisfies(21, 21));
        assert!(!java_satisfies(17, 21));
        assert!(java_satisfies(25, 25));
        assert!(!java_satisfies(21, 25));
    }
}
