fn main() {
    #[cfg(feature = "export_candid")]
    {
        println!("{}", wallet_factory_backend::candid_export::export_candid());
    }
}
