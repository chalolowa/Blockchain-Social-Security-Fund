fn main() {
    #[cfg(feature = "export_candid")]
    {
        println!("{}", identity_broker_backend::candid_export::export_candid());
    }
}
