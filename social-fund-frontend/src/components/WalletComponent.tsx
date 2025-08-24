import { Bitcoin, Coins, Copy, DollarSign, RefreshCw, Send, Shield, TrendingUp, Wallet, History } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const TOKEN_ICONS = {
  Icp: Coins,
  CkBtc: Bitcoin,
  CkUsdt: DollarSign,
};

const TOKEN_COLORS = {
  Icp: "text-blue-600 bg-blue-50",
  CkBtc: "text-orange-600 bg-orange-50",
  CkUsdt: "text-green-600 bg-green-50",
};

export function WalletComponent() {
  const { 
    WalletState, 
    initializeWallet, 
    refreshWalletData, 
    updateBalance,
    batchUpdateBalances,
    transferTokens 
  } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferForm, setTransferForm] = useState({
    vaultType: "",
    amount: "",
    recipient: "",
  });

  const [refreshingBalances, setRefreshingBalances] = useState<string[]>([]);

  useEffect(() => {
    if (!WalletState.walletId) {
      handleInitializeWallet();
    }
  }, []);

  const handleInitializeWallet = async () => {
    try {
      await initializeWallet();
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
    }
  };

  const handleRefreshAllBalances = async () => {
    try {
      await batchUpdateBalances();
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    }
  };

  const handleRefreshSingleBalance = async (vaultType: string) => {
    setRefreshingBalances(prev => [...prev, vaultType]);
    try {
      await updateBalance(vaultType);
      toast.success(`${vaultType} balance updated!`);
    } catch (error) {
      console.error(`Failed to refresh ${vaultType} balance:`, error);
    } finally {
      setRefreshingBalances(prev => prev.filter(type => type !== vaultType));
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.vaultType || !transferForm.amount || !transferForm.recipient) {
      toast.error("Please fill in all transfer fields");
      return;
    }

    setIsTransferring(true);
    try {
      const amount = BigInt(Math.floor(parseFloat(transferForm.amount) * 100000000)); // Convert to smallest unit
      await transferTokens(transferForm.vaultType, amount, transferForm.recipient);
      
      setTransferForm({
        vaultType: "",
        amount: "",
        recipient: "",
      });
    } catch (error) {
      console.error("Transfer failed:", error);
    } finally {
      setIsTransferring(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatBalance = (balance: number) => {
    return balance.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    });
  };

  const formatCurrency = (balance: number, symbol: string) => {
    return `${formatBalance(balance)} ${symbol}`;
  };

  if (!WalletState.walletId) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Initialize Your Wallet</h3>
          <p className="text-gray-500 text-center mb-6 max-w-md">
            Create your digital wallet to start managing your cryptocurrency assets and retirement savings.
          </p>
          <Button 
            onClick={handleInitializeWallet}
            disabled={WalletState.loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {WalletState.loading ? "Initializing..." : "Initialize Wallet"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Digital Wallet</h1>
                <p className="text-gray-600">Manage your cryptocurrency assets</p>
              </div>
            </div>
            
            <Button 
              onClick={handleRefreshAllBalances}
              disabled={WalletState.loading}
              variant="outline"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${WalletState.loading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {WalletState.balances && Object.entries(WalletState.balances).map(([token, balance]) => {
          const Icon = TOKEN_ICONS[token as keyof typeof TOKEN_ICONS];
          const colorClasses = TOKEN_COLORS[token as keyof typeof TOKEN_COLORS];
          const isRefreshing = refreshingBalances.includes(token);
          
          return (
            <Card key={token} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${colorClasses}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRefreshSingleBalance(token)}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">{token.replace('Ck', '')} Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(balance, token.replace('Ck', '').toUpperCase())}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Wallet Interface */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="send">Send</TabsTrigger>
                <TabsTrigger value="receive">Receive</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="p-6">
              <div className="space-y-6">
                {/* Wallet Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Wallet Information
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Wallet ID:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white px-2 py-1 rounded">
                          {WalletState.walletId.toText().slice(0, 20)}...
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(WalletState.walletId!.toText(), "Wallet ID")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {WalletState.btcAddress && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Bitcoin Address:</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-white px-2 py-1 rounded">
                            {WalletState.btcAddress.slice(0, 20)}...
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(WalletState.btcAddress!, "Bitcoin Address")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                {WalletState.WalletInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Total Transactions</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {Number(WalletState.WalletInfo.usage_statistics.total_transactions)}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Total Volume</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {formatBalance(Number(WalletState.WalletInfo.usage_statistics.total_volume))}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">Security Level</span>
                      </div>
                      <Badge className="text-purple-800 bg-purple-200">
                        {WalletState.WalletInfo.security_settings.two_factor_enabled ? "High" : "Standard"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="send" className="p-6">
              <div className="max-w-md mx-auto space-y-4">
                <h3 className="text-lg font-semibold text-center">Send Cryptocurrency</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Token Type</Label>
                    <Select 
                      value={transferForm.vaultType} 
                      onValueChange={(value) => setTransferForm(prev => ({ ...prev, vaultType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Icp">ICP</SelectItem>
                        <SelectItem value="CkBtc">Bitcoin (ckBTC)</SelectItem>
                        <SelectItem value="CkUsdt">USDT (ckUSDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00000000"
                    />
                  </div>

                  <div>
                    <Label>Recipient Address</Label>
                    <Input
                      value={transferForm.recipient}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, recipient: e.target.value }))}
                      placeholder="Enter recipient's address"
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleTransfer}
                    disabled={isTransferring || !transferForm.vaultType || !transferForm.amount || !transferForm.recipient}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isTransferring ? "Sending..." : "Send Transaction"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="receive" className="p-6">
              <div className="max-w-md mx-auto space-y-6">
                <h3 className="text-lg font-semibold text-center">Receive Cryptocurrency</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Label className="text-sm font-medium">Your Wallet Address (ICP/USDT)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-white px-3 py-2 rounded flex-1 break-all">
                        {WalletState.walletId.toText()}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(WalletState.walletId!.toText(), "Wallet Address")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {WalletState.btcAddress && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <Label className="text-sm font-medium">Your Bitcoin Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-white px-3 py-2 rounded flex-1 break-all">
                          {WalletState.btcAddress}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(WalletState.btcAddress!, "Bitcoin Address")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Use the appropriate address for the token you want to receive. 
                      Always verify the address before sending funds.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transaction History
                </h3>
                
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Transaction history will be displayed here</p>
                  <p className="text-sm text-gray-400 mt-2">
                    This feature is coming soon
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {WalletState.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="font-medium text-red-800">Wallet Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{WalletState.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}