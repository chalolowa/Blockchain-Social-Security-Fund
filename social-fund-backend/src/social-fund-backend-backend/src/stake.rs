use candid::Principal;

pub async fn request_staking(user: Principal, mode: String) -> Result<(), String> {
    let wallet_id = crate::utils::get_wallet_of(user).await?;

    ic_cdk::call::<_, ()>(
        wallet_id,
        "approve_staking",
        (mode == "active",),
    )
    .await
    .map_err(|(_, e)| format!("Staking failed: {}", e))
}
