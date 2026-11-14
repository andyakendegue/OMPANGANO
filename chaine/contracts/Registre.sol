// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.37;

/**
 * Registre de la chaîne Nkorouna.
 *
 * - Certification : un émetteur agréé (université, administration, magasin, Nkala…) publie l'empreinte SHA-256
 *   d'un document, jamais le document lui-même ni aucune donnée personnelle. N'importe qui vérifie ensuite un fichier
 *   en recalculant son empreinte. Seul l'émetteur d'origine peut révoquer.
 * - Ancrage : une application publie la racine de Merkle de son propre registre (ex. mouvements Nkorouna de Nkala,
 *   rangs `de` à `jusqua`) ; une fois écrite, l'application ne peut plus réécrire ce passé sans que ça se voie.
 * - Les émetteurs sont agréés par l'administrateur du réseau (plus tard : un vote des validateurs).
 */
contract Registre {
    struct Emetteur { bool actif; string nom; }
    struct Certificat { address emetteur; uint64 date; uint64 revoqueLe; }
    struct Ancrage { address emetteur; uint64 de; uint64 jusqua; uint64 date; }

    address public administrateur;
    mapping(address => Emetteur) private emetteurs;
    mapping(bytes32 => Certificat) private certificats;
    mapping(bytes32 => Ancrage) private ancrages;

    event AdministrateurChange(address indexed ancien, address indexed nouveau);
    event EmetteurAgree(address indexed emetteur, string nom);
    event EmetteurRetire(address indexed emetteur);
    event Certifie(bytes32 indexed empreinte, address indexed emetteur);
    event Revoque(bytes32 indexed empreinte, address indexed emetteur);
    event Ancre(bytes32 indexed racine, address indexed emetteur, uint64 de, uint64 jusqua);

    error NonAdministrateur();
    error NonEmetteur();
    error AdresseNulle();
    error NomInvalide();
    error DejaCertifie();
    error Inconnu();
    error PasLEmetteur();
    error DejaRevoque();
    error DejaAncre();
    error RangsInvalides();
    error EmpreinteNulle();

    modifier seulAdministrateur() { if (msg.sender != administrateur) revert NonAdministrateur(); _; }
    modifier seulEmetteur() { if (!emetteurs[msg.sender].actif) revert NonEmetteur(); _; }

    constructor(address administrateur_) {
        if (administrateur_ == address(0)) revert AdresseNulle();
        administrateur = administrateur_;
        emit AdministrateurChange(address(0), administrateur_);
    }

    // ------------------------------------------------------------------ administration

    function changerAdministrateur(address nouveau) external seulAdministrateur {
        if (nouveau == address(0)) revert AdresseNulle();
        emit AdministrateurChange(administrateur, nouveau);
        administrateur = nouveau;
    }

    function agreerEmetteur(address emetteur, string calldata nom) external seulAdministrateur {
        if (emetteur == address(0)) revert AdresseNulle();
        uint256 n = bytes(nom).length;
        if (n == 0 || n > 120) revert NomInvalide();
        emetteurs[emetteur] = Emetteur(true, nom);
        emit EmetteurAgree(emetteur, nom);
    }

    /** Un émetteur retiré ne peut plus rien publier ; ses certificats passés restent vérifiables (et révocables par lui seul). */
    function retirerEmetteur(address emetteur) external seulAdministrateur {
        emetteurs[emetteur].actif = false;
        emit EmetteurRetire(emetteur);
    }

    function emetteur(address adresse) external view returns (bool actif, string memory nom) {
        Emetteur storage e = emetteurs[adresse];
        return (e.actif, e.nom);
    }

    // ------------------------------------------------------------------ certification

    function certifier(bytes32 empreinte) external seulEmetteur {
        if (empreinte == bytes32(0)) revert EmpreinteNulle();
        if (certificats[empreinte].date != 0) revert DejaCertifie();
        certificats[empreinte] = Certificat(msg.sender, uint64(block.timestamp), 0);
        emit Certifie(empreinte, msg.sender);
    }

    function revoquer(bytes32 empreinte) external {
        Certificat storage c = certificats[empreinte];
        if (c.date == 0) revert Inconnu();
        if (c.emetteur != msg.sender) revert PasLEmetteur();
        if (c.revoqueLe != 0) revert DejaRevoque();
        c.revoqueLe = uint64(block.timestamp);
        emit Revoque(empreinte, msg.sender);
    }

    /** date = 0 : empreinte inconnue. revoqueLe = 0 : toujours valable. */
    function verifier(bytes32 empreinte) external view returns (address emetteur_, string memory nomEmetteur, uint64 date, uint64 revoqueLe) {
        Certificat storage c = certificats[empreinte];
        return (c.emetteur, emetteurs[c.emetteur].nom, c.date, c.revoqueLe);
    }

    // ------------------------------------------------------------------ ancrage

    function ancrer(bytes32 racine, uint64 de, uint64 jusqua) external seulEmetteur {
        if (racine == bytes32(0)) revert EmpreinteNulle();
        if (de == 0 || jusqua < de) revert RangsInvalides();
        if (ancrages[racine].date != 0) revert DejaAncre();
        ancrages[racine] = Ancrage(msg.sender, de, jusqua, uint64(block.timestamp));
        emit Ancre(racine, msg.sender, de, jusqua);
    }

    function verifierAncrage(bytes32 racine) external view returns (address emetteur_, string memory nomEmetteur, uint64 de, uint64 jusqua, uint64 date) {
        Ancrage storage a = ancrages[racine];
        return (a.emetteur, emetteurs[a.emetteur].nom, a.de, a.jusqua, a.date);
    }
}
