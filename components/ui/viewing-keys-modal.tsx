"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, Shuffle, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Keys, ViewingKeys } from "@/lib/types";

interface ViewingKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewingKeysModal({
  open,
  onOpenChange,
}: ViewingKeysModalProps) {
  const { setViewingKeys, viewingKeys } = useAppStore();
  const [keys, setKeys] = useState<Keys>({
    sSCRT: viewingKeys?.sSCRT || "",
    sUSDC: viewingKeys?.sUSDC || "",
  });
  const [showSSCRT, setShowSSCRT] = useState(false);
  const [showSUSDC, setShowSUSDC] = useState(false);

  const generateViewingKeys = () => {
    // Generate mock viewing keys
    const generateKey = () => {
      return Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
      ).join("");
    };

    setKeys({
      sSCRT: generateKey(),
      sUSDC: generateKey(),
    });
  };

  const handleSubmit = () => {
    if (keys.sSCRT.trim() && keys.sUSDC.trim()) {
      setViewingKeys(keys);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    // Reset to original values if user cancels
    setKeys({
      sSCRT: viewingKeys?.sSCRT || "",
      sUSDC: viewingKeys?.sUSDC || "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage Viewing Keys
          </DialogTitle>
          <DialogDescription>
            Viewing keys are required to query your token balances privately on
            Secret Network.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sSCRT-key">sSCRT Viewing Key</Label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  id="sSCRT-key"
                  type={showSSCRT ? "text" : "password"}
                  placeholder="Enter sSCRT viewing key..."
                  value={keys.sSCRT}
                  onChange={(e) => setKeys({ ...keys, sSCRT: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowSSCRT(!showSSCRT)}
                >
                  {showSSCRT ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sUSDC-key">sUSDC Viewing Key</Label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  id="sUSDC-key"
                  type={showSUSDC ? "text" : "password"}
                  placeholder="Enter sUSDC viewing key..."
                  value={keys.sUSDC}
                  onChange={(e) => setKeys({ ...keys, sUSDC: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowSUSDC(!showSUSDC)}
                >
                  {showSUSDC ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={generateViewingKeys}
            className="w-full"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Generate Viewing Keys
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!keys.sSCRT.trim() || !keys.sUSDC.trim()}
          >
            Save Viewing Keys
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
