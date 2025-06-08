use candid::Principal;
use crate::utils::get_wallet_of;
use crate::token_registry::get_token_metadata;

pub async fn split_and_contribute(
    employer: Principal,
    employee: Principal,
    total_amount: u128,
) -> Result<(), String> {
    let half = total_amount / 2;

    let btc_token = get_token_metadata("ckBTC").await?;
    let usdc_token = get_token_metadata("ckUSDC").await?;

    let employee_wallet = get_wallet_of(employee).await?;

    // Call wallet deposit method for each token
    crate::utils::transfer_to_wallet(employer, employee_wallet, &btc_token, half).await?;
    crate::utils::transfer_to_wallet(employer, employee_wallet, &usdc_token, half).await?;

    Ok(())
}
