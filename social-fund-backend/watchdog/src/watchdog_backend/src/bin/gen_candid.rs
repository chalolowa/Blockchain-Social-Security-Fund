fn main() {
    #[cfg(feature = "export_candid")]
    {
        println!("{}", watchdog_backend::candid_export::export_candid());
    }
}
