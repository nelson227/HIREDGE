"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { authApi } from "@/lib/api"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage("Lien de vérification invalide")
      return
    }

    authApi.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error")
        setErrorMessage(err.response?.data?.error?.message || "Lien invalide ou expiré")
      })
  }, [token])

  return (
    <div className="text-center space-y-4">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Vérification en cours...</h1>
        </>
      )}

      {status === "success" && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Email vérifié !</h1>
          <p className="text-muted-foreground">
            Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter pleinement d'HIREDGE.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Aller au tableau de bord</Link>
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Erreur de vérification</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-12 justify-center w-full">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">HIREDGE</span>
        </Link>

        <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  )
}
