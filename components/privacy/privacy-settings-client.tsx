"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateAudioConsent,
  deleteTranscripts,
  deleteAccount,
} from "@/app/(app)/settings/privacy/actions";

interface Props {
  audioConsent: boolean;
}

export function PrivacySettingsClient({ audioConsent: initialConsent }: Props) {
  const [audioConsent, setAudioConsent] = useState(initialConsent);
  const [deletingTranscripts, setDeletingTranscripts] = useState(false);
  const [transcriptsDeleted, setTranscriptsDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleAudioConsentToggle() {
    const newValue = !audioConsent;
    setAudioConsent(newValue);
    await updateAudioConsent({ consent: newValue });
  }

  async function handleDeleteTranscripts() {
    setDeletingTranscripts(true);
    try {
      await deleteTranscripts();
      setTranscriptsDeleted(true);
    } finally {
      setDeletingTranscripts(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      // Redirect to login after deletion
      window.location.href = "/login";
    } catch {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Audio consent toggle */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Voice Recording Storage</p>
            <p className="text-xs text-muted-foreground mt-1">
              Allow storing your voice recordings for future analysis. Off by default.
            </p>
          </div>
          <button
            onClick={handleAudioConsentToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              audioConsent ? "bg-primary" : "bg-muted"
            }`}
            role="switch"
            aria-checked={audioConsent}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                audioConsent ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <Badge variant="outline" className="text-xs">
          {audioConsent ? "Recordings stored" : "Recordings not stored (default)"}
        </Badge>
      </div>

      {/* Transcript/writing deletion */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="font-medium text-sm">Delete Transcripts & Writing Submissions</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete all your conversation transcripts and writing submissions.
          Error records and progress data are not affected.
        </p>
        {transcriptsDeleted ? (
          <p className="text-xs text-green-600">Transcripts and writing deleted.</p>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDeleteTranscripts}
            disabled={deletingTranscripts}
          >
            {deletingTranscripts ? "Deleting…" : "Delete Transcripts & Writing"}
          </Button>
        )}
      </div>

      {/* Account deletion */}
      <div className="border border-red-200 rounded-lg p-4 space-y-3 bg-red-50/30">
        <p className="font-medium text-sm text-red-700">Delete Account</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete your account and ALL associated learning data. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            Delete My Account
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-red-700">
              Are you absolutely sure? This will delete all your data permanently.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deletingAccount}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Deleting…" : "Yes, delete everything"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
