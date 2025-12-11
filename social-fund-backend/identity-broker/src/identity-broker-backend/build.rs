use std::{env, fs, path::PathBuf, process::Command};

fn main() {
    // Avoid infinite recursion when build.rs spawns cargo
    if env::var("SKIP_CANDID_GEN").is_ok() {
        return;
    }

    // Only attempt to generate DID for host builds
    let target = env::var("TARGET").unwrap_or_default();
    if target.contains("wasm32") {
        return;
    }

    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let did_path = manifest_dir.join("identity-broker-backend.did");

    // Run the small helper binary to print candid; capture its stdout
    let output = Command::new("cargo")
        .env("SKIP_CANDID_GEN", "1")
        .current_dir(&manifest_dir)
        .args(["run", "--quiet", "--bin", "gen_candid", "--features", "export_candid"]) 
        .output();

    match output {
        Ok(out) if out.status.success() => {
            if let Err(e) = fs::write(&did_path, out.stdout) {
                eprintln!("cargo:warning=Failed to write DID: {}", e);
            } else {
                println!("cargo:warning=Generated Candid DID at {}", did_path.display());
            }
        }
        Ok(out) => {
            eprintln!(
                "cargo:warning=gen_candid failed (status: {}): {}",
                out.status,
                String::from_utf8_lossy(&out.stderr)
            );
        }
        Err(e) => {
            eprintln!("cargo:warning=Failed to run cargo gen_candid: {}", e);
        }
    }

    // Re-run if sources change
    println!("cargo:rerun-if-changed=src/lib.rs");
}
