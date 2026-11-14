// Contrat Registre : administration, certification, révocation, ancrage, refus.
const { expect } = require('chai');
const { ethers } = require('hardhat');

const empreinte = texte => ethers.sha256(ethers.toUtf8Bytes(texte));

describe('Registre', () => {
  let registre, admin, universite, magasin, inconnu;

  beforeEach(async () => {
    [admin, universite, magasin, inconnu] = await ethers.getSigners();
    registre = await (await ethers.getContractFactory('Registre')).deploy(admin.address);
    await registre.agreerEmetteur(universite.address, 'Université Omar Bongo (essai)');
    await registre.agreerEmetteur(magasin.address, 'Magasin de démonstration');
  });

  it('refuse un administrateur nul au déploiement', async () => {
    const F = await ethers.getContractFactory('Registre');
    await expect(F.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(registre, 'AdresseNulle');
  });

  it('seul l\'administrateur agrée, retire et se fait remplacer', async () => {
    await expect(registre.connect(inconnu).agreerEmetteur(inconnu.address, 'Moi')).to.be.revertedWithCustomError(registre, 'NonAdministrateur');
    await expect(registre.connect(inconnu).retirerEmetteur(universite.address)).to.be.revertedWithCustomError(registre, 'NonAdministrateur');
    await expect(registre.agreerEmetteur(inconnu.address, '')).to.be.revertedWithCustomError(registre, 'NomInvalide');
    await expect(registre.agreerEmetteur(inconnu.address, 'x'.repeat(121))).to.be.revertedWithCustomError(registre, 'NomInvalide');
    await expect(registre.changerAdministrateur(inconnu.address)).to.emit(registre, 'AdministrateurChange').withArgs(admin.address, inconnu.address);
    await expect(registre.agreerEmetteur(magasin.address, 'Encore')).to.be.revertedWithCustomError(registre, 'NonAdministrateur');
    expect(await registre.administrateur()).to.equal(inconnu.address);
  });

  it('certifie une empreinte une seule fois et la rend vérifiable', async () => {
    const e = empreinte('Diplôme n° 2026-0042 (exemple inventé)');
    await expect(registre.connect(universite).certifier(e)).to.emit(registre, 'Certifie').withArgs(e, universite.address);
    const [qui, nom, date, revoque] = await registre.verifier(e);
    expect(qui).to.equal(universite.address); expect(nom).to.equal('Université Omar Bongo (essai)');
    expect(date).to.be.greaterThan(0n); expect(revoque).to.equal(0n);
    await expect(registre.connect(magasin).certifier(e)).to.be.revertedWithCustomError(registre, 'DejaCertifie');
    await expect(registre.connect(universite).certifier(ethers.ZeroHash)).to.be.revertedWithCustomError(registre, 'EmpreinteNulle');
    const [, , dateInconnue] = await registre.verifier(empreinte('document jamais certifié'));
    expect(dateInconnue).to.equal(0n);
  });

  it('un non-émetteur ou un émetteur retiré ne publie rien', async () => {
    await expect(registre.connect(inconnu).certifier(empreinte('a'))).to.be.revertedWithCustomError(registre, 'NonEmetteur');
    await expect(registre.connect(inconnu).ancrer(empreinte('r'), 1, 2)).to.be.revertedWithCustomError(registre, 'NonEmetteur');
    await registre.connect(magasin).certifier(empreinte('facture 1'));
    await expect(registre.retirerEmetteur(magasin.address)).to.emit(registre, 'EmetteurRetire');
    await expect(registre.connect(magasin).certifier(empreinte('facture 2'))).to.be.revertedWithCustomError(registre, 'NonEmetteur');
    const [qui] = await registre.verifier(empreinte('facture 1'));
    expect(qui).to.equal(magasin.address, 'les certificats passés restent vérifiables');
    expect((await registre.emetteur(magasin.address))[0]).to.equal(false);
  });

  it('seul l\'émetteur d\'origine révoque, une seule fois', async () => {
    const e = empreinte('Attestation (exemple inventé)');
    await expect(registre.revoquer(e)).to.be.revertedWithCustomError(registre, 'Inconnu');
    await registre.connect(universite).certifier(e);
    await expect(registre.connect(magasin).revoquer(e)).to.be.revertedWithCustomError(registre, 'PasLEmetteur');
    await expect(registre.connect(universite).revoquer(e)).to.emit(registre, 'Revoque').withArgs(e, universite.address);
    expect((await registre.verifier(e))[3]).to.be.greaterThan(0n);
    await expect(registre.connect(universite).revoquer(e)).to.be.revertedWithCustomError(registre, 'DejaRevoque');
  });

  it('ancre une racine de Merkle une seule fois, avec des rangs cohérents', async () => {
    const r = empreinte('racine des mouvements 1 à 12');
    await expect(registre.connect(magasin).ancrer(r, 1, 12)).to.emit(registre, 'Ancre').withArgs(r, magasin.address, 1, 12);
    const [qui, nom, de, jusqua, date] = await registre.verifierAncrage(r);
    expect([qui, nom, de, jusqua]).to.deep.equal([magasin.address, 'Magasin de démonstration', 1n, 12n]); expect(date).to.be.greaterThan(0n);
    await expect(registre.connect(magasin).ancrer(r, 13, 20)).to.be.revertedWithCustomError(registre, 'DejaAncre');
    await expect(registre.connect(magasin).ancrer(empreinte('x'), 0, 3)).to.be.revertedWithCustomError(registre, 'RangsInvalides');
    await expect(registre.connect(magasin).ancrer(empreinte('y'), 5, 4)).to.be.revertedWithCustomError(registre, 'RangsInvalides');
    await expect(registre.connect(magasin).ancrer(ethers.ZeroHash, 1, 1)).to.be.revertedWithCustomError(registre, 'EmpreinteNulle');
  });
});
