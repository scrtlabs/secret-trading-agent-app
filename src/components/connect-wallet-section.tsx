"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, WalletIcon as WalletX } from "lucide-react"
import { useAppStore } from "@/lib/store"

export function ConnectWalletSection() {
  const [mnemonic, setMnemonic] = useState("")
  const { wallet, isLoading, connectWallet, disconnectWallet } = useAppStore()

  const handleConnect = async () => {
    if (!mnemonic.trim()) return

    try {
      await connectWallet(mnemonic)
      setMnemonic("")
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
    setMnemonic("")
  }

  if (wallet.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            Wallet Connected
          </CardTitle>
          <CardDescription>Address: {wallet.address}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDisconnect} variant="outline" className="w-full">
            <WalletX className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription>Enter your mnemonic phrase to connect to Secret Network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="password"
          placeholder="Enter your mnemonic phrase..."
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        />
        <Button onClick={handleConnect} disabled={!mnemonic.trim() || isLoading} className="w-full">
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </Button>
      </CardContent>
    </Card>
  )
}
