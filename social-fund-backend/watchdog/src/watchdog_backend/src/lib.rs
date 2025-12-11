#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

// Feature-gated Candid export for build-time DID generation
#[cfg(feature = "export_candid")]
pub mod candid_export {
    pub fn export_candid() -> String {
        ic_cdk::export_candid!();
        __export_service()
    }
}
