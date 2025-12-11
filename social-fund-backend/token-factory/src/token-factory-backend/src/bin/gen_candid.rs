fn main() {
    #[cfg(feature = "export_candid")]
    {
        println!("{}", token_factory_backend::candid_export::export_candid());
    }
}
