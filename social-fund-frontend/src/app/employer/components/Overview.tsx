"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, Shield, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function Overview() {
  const [fundInfo, setFundInfo] = useState<any>(null);
  const { userDetails, initializeWallet, refreshWalletData, WalletState } = useAuth();

  const total = (fundInfo?.ckbtc_reserve || 0) + (fundInfo?.stable_reserve || 0);
  const ckbtcPercent = total > 0 ? (fundInfo.ckbtc_reserve / total) * 100 : 0;

  const handleInitializeWallet = async () => {
    try {
      await initializeWallet();
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
    }
  };

  const handleRefreshWallet = async () => {
    try {
      await refreshWalletData();
      toast.success("Wallet data refreshed!");
    } catch (error) {
      console.error("Failed to refresh wallet:", error);
      toast.error("Failed to refresh wallet data");
    }
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Digital Wallet
            </h3>
            
            <div className="flex gap-2">
              {!WalletState.walletId ? (
                <Button 
                  onClick={handleInitializeWallet}
                  disabled={WalletState.loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {WalletState.loading ? "Initializing..." : "Initialize Wallet"}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleRefreshWallet}
                  disabled={WalletState.loading}
                >
                  Refresh Balances
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {WalletState.walletId ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-700">ICP Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {WalletState.balances ? formatBalance(WalletState.balances.Icp) : "0.00"} ICP
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium text-orange-700">Bitcoin Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {WalletState.balances ? formatBalance(WalletState.balances.CkBtc) : "0.00"} BTC
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">USDT Balance</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {WalletState.balances ? formatBalance(WalletState.balances.CkUsdt) : "0.00"} USDT
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Wallet Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Wallet ID:</span>
                    <p className="font-mono text-xs break-all">{WalletState.walletId.toText()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Bitcoin Address:</span>
                    <p className="font-mono text-xs break-all">{WalletState.btcAddress || "Loading..."}</p>
                  </div>
                </div>
              </div>

              {WalletState.WalletInfo && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Wallet Statistics</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-purple-600">Total Transactions:</span>
                      <p className="font-semibold">{Number(WalletState.WalletInfo.usage_statistics.total_transactions)}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Total Volume:</span>
                      <p className="font-semibold">{formatBalance(Number(WalletState.WalletInfo.usage_statistics.total_volume))}</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Created:</span>
                      <p className="font-semibold">
                        {new Date(Number(WalletState.WalletInfo.created_at) / 1000000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">No Wallet Initialized</h4>
              <p className="text-gray-500 mb-4">
                Initialize your digital wallet to start managing your crypto assets and contribute to your employees future.
              </p>
            </div>
          )}

          {WalletState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-red-700">Wallet Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{WalletState.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

