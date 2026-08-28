fn main() {
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=capabilities");
    println!("cargo:rerun-if-changed=icons");
    println!("cargo:rerun-if-changed=src");

    tauri_build::build();
}
