# Guide -- Lancer ton projet avec Expo Go (iPhone)

## 1. Vérifier que ton projet est compatible Expo

Dans ton fichier `package.json`, vérifie la présence de :

    "expo": "...",
    "react-native": "..."

Si ces dépendances sont présentes, ton projet est compatible Expo.

------------------------------------------------------------------------

## 2. Ouvrir le projet dans VS Code

-   Ouvre VS Code
-   Ouvre le dossier de ton projet
-   Ouvre le terminal intégré

------------------------------------------------------------------------

## 3. Installer les dépendances

Dans le terminal :

    npm install

------------------------------------------------------------------------

## 4. Lancer le serveur Expo

Toujours dans le terminal :

    npx expo start

Cela va :

-   démarrer un serveur de développement
-   afficher un QR code

------------------------------------------------------------------------

## 5. Sur ton iPhone

### Étapes :

1.  Installer Expo Go depuis l'App Store
2.  Connecter ton iPhone et ton PC au même Wi-Fi
3.  Ouvrir l'application caméra de l'iPhone
4.  Scanner le QR code affiché dans le terminal

L'application va s'ouvrir automatiquement dans Expo Go.

------------------------------------------------------------------------

## 6. Si ça ne marche pas (réseau)

Lancer Expo en mode tunnel :

    npx expo start --tunnel

------------------------------------------------------------------------

## 7. Workflow complet

    cd ton-projet
    npm install
    npx expo start

Puis scanner le QR code avec ton iPhone.

------------------------------------------------------------------------

## 8. Rechargement automatique

Chaque modification dans VS Code :

→ recharge automatiquement l'app sur ton iPhone

------------------------------------------------------------------------

## 9. Problèmes possibles

### Erreurs fréquentes :

-   Module natif non supporté
-   App ne s'ouvre pas dans Expo Go

### Solution :

Ton projet nécessite probablement un **development build** (et non Expo
Go).

------------------------------------------------------------------------

## 10. Conclusion

Expo Go permet de :

-   tester rapidement ton app sur iPhone
-   voir les changements en temps réel
-   développer sans Mac

C'est idéal pour tester ton MVP (comme HIREDGE).
