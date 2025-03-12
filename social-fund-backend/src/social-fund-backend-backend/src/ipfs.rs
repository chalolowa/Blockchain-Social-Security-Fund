use candid::{CandidType, Deserialize, Principal};
use std::collections::HashMap;

#[derive(CandidType, Deserialize)]
pub struct FileRecord {
    pub ipfs_hash: String,
    pub owner: String,
    pub created_at: u64,
    pub is_public: bool,
}

thread_local! {
    static FILE_STORAGE: std::cell::RefCell<HashMap<String, FileRecord>> = std::cell::RefCell::new(HashMap::new());
}

// Store file hash (assumes frontend uploads to IPFS and sends hash)
pub fn store_file(ipfs_hash: String, is_public: bool) -> Result<String, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Anonymous calls not allowed".to_string());
    }

    let now = ic_cdk::api::time() as u64 / 1_000_000_000;

    FILE_STORAGE.with(|storage| {
        let mut files = storage.borrow_mut();
        if files.contains_key(&ipfs_hash) {
            return Err("File already exists".to_string());
        }

        files.insert(ipfs_hash.clone(), FileRecord {
            ipfs_hash: ipfs_hash.clone(),
            owner: caller.to_string(),
            created_at: now,
            is_public,
        });

        Ok(format!("File {} stored successfully", ipfs_hash))
    })
}

// Retrieve file using hash
pub fn get_file(ipfs_hash: String) -> Result<FileRecord, String> {
    let caller = ic_cdk::caller();
    
    FILE_STORAGE.with(|storage| {
        let files = storage.borrow();
        files.get(&ipfs_hash)
            .filter(|metadata| metadata.is_public || metadata.owner == caller.to_string())
            .map(|metadata| FileRecord {
                ipfs_hash: metadata.ipfs_hash.clone(),
                owner: metadata.owner.clone(),
                created_at: metadata.created_at,
                is_public: metadata.is_public,
            })
            .ok_or_else(|| "File not found or access denied".to_string())
    })
}
