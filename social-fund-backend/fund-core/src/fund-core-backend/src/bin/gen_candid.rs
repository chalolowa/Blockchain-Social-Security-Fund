fn main() {
    #[cfg(feature = "export_candid")]
    {
        println!("{}", fund_core_backend::candid_export::export_candid());
    }
}
