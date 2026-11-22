#!/usr/bin/env python3
"""Sons d'ambiance des scènes d'Onênji (lot 11, 22 nov. 2026) : boucles de 12 s synthétisées (aucun enregistrement extérieur,
aucun droit à payer), une par décor : lagune (eau qui clapote, oiseaux d'eau), mer (vagues), forêt (oiseaux, insectes),
marché (rumeur de voix, petits chocs), village (oiseaux, rumeur lointaine), maison (feu qui crépite), ciel (grillons du soir).
Sortie : apps/nkala/assets/ambiance/<décor>.m4a (afconvert, AAC mono 22 kHz). Python seul (pas de numpy). Relançable."""
import math, os, random, struct, subprocess, tempfile, wave

ICI = os.path.dirname(os.path.abspath(__file__)); OMP = os.path.abspath(os.path.join(ICI, "..", ".."))
OUT = os.path.join(OMP, "apps/nkala/assets/ambiance"); os.makedirs(OUT, exist_ok=True)
SR, DUREE = 22050, 12.0
N = int(SR * DUREE)


def bruit_filtre(n, a, graine):
    """Bruit blanc filtré passe-bas (un pôle, coefficient a)."""
    r = random.Random(graine); y = 0.0; out = [0.0] * n
    for i in range(n):
        y += a * (r.uniform(-1, 1) - y); out[i] = y
    return out


def brun(n, graine, pas=0.02):
    r = random.Random(graine); y = 0.0; out = [0.0] * n
    for i in range(n):
        y = max(-1, min(1, y * 0.998 + r.uniform(-pas, pas))); out[i] = y
    return out


def chant(buf, t0, f0, f1, d, amp, vib=0.0):
    """Petit chant d'oiseau : glissement de fréquence avec enveloppe."""
    i0 = int(t0 * SR); n = int(d * SR); ph = 0.0
    for k in range(n):
        if i0 + k >= N: break
        x = k / n; f = f0 + (f1 - f0) * x + vib * math.sin(2 * math.pi * 30 * k / SR) * f0
        ph += 2 * math.pi * f / SR
        env = math.sin(math.pi * x) ** 2
        buf[i0 + k] += amp * env * math.sin(ph)


def oiseaux(buf, graine, nb, fmin=2200, fmax=4200, amp=0.12):
    r = random.Random(graine)
    for _ in range(nb):
        t = r.uniform(0.2, DUREE - 1.2); f = r.uniform(fmin, fmax)
        for j in range(r.randint(1, 4)):
            chant(buf, t + j * 0.14, f, f * r.uniform(0.8, 1.3), r.uniform(0.06, 0.13), amp * r.uniform(0.5, 1), vib=0.02)


def grillons(buf, graine, amp=0.05):
    r = random.Random(graine)
    for voix in range(3):
        f = r.uniform(3800, 4600); periode = r.uniform(0.35, 0.6); dec = r.uniform(0, 0.3)
        for i in range(N):
            t = i / SR + dec
            if (t % periode) < 0.12 and math.sin(2 * math.pi * 55 * t) > 0:
                buf[i] += amp * math.sin(2 * math.pi * f * t)


def chocs(buf, graine, nb, amp=0.18, f=1800):
    r = random.Random(graine)
    for _ in range(nb):
        i0 = int(r.uniform(0, DUREE - 0.2) * SR); ff = f * r.uniform(0.7, 1.6)
        for k in range(int(0.08 * SR)):
            if i0 + k < N: buf[i0 + k] += amp * math.exp(-k / (0.012 * SR)) * math.sin(2 * math.pi * ff * k / SR)


def crepitements(buf, graine, nb, amp=0.25):
    r = random.Random(graine)
    for _ in range(nb):
        i0 = int(r.uniform(0, DUREE - 0.05) * SR); a = amp * r.uniform(0.3, 1)
        for k in range(int(0.006 * SR)):
            if i0 + k < N: buf[i0 + k] += a * r.uniform(-1, 1) * math.exp(-k / (0.0015 * SR))


def vagues(periode, profondeur, graine):
    b = bruit_filtre(N, 0.08, graine)
    return [b[i] * (0.25 + profondeur * (0.5 + 0.5 * math.sin(2 * math.pi * i / SR / periode)) ** 3) for i in range(N)]


def rumeur(graine, amp=0.5):
    """Rumeur de voix : bruit dans la bande de la parole, modulé au rythme des syllabes."""
    b = bruit_filtre(N, 0.25, graine); lent = bruit_filtre(N, 0.0006, graine + 1)
    r = random.Random(graine + 2); m = [0.0] * N
    for v in range(6):
        f = r.uniform(3, 6); ph = r.uniform(0, 6.28)
        for i in range(N): m[i] += max(0.0, math.sin(2 * math.pi * f * i / SR + ph + 3 * lent[i]))
    prec = 0.0; out = [0.0] * N
    for i in range(N):
        prec += 0.35 * (b[i] - prec)  # adoucit encore (moins de souffle)
        out[i] = amp * prec * (0.3 + m[i] / 6)
    return out


def boucle(buf, fondu=1.0):
    """Fondu enchaîné fin → début pour une boucle sans couture."""
    nf = int(fondu * SR)
    for k in range(nf):
        a = k / nf
        buf[k] = buf[k] * a + buf[N - nf + k] * (1 - a)
    return buf[: N - nf]


def ecrire(nom, buf):
    buf = boucle(buf)
    crete = max(1e-6, max(abs(x) for x in buf)); g = 0.85 / crete
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, nom + ".wav")
        with wave.open(w, "wb") as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
            f.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, x * g)) * 32767)) for x in buf))
        dst = os.path.join(OUT, nom + ".m4a")
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", w, dst], check=True)
    print(nom, os.path.getsize(dst), "octets")


def main():
    add = lambda *bs: [sum(v) for v in zip(*bs)]
    # lagune : clapotis (bruit lent modulé) + oiseaux d'eau graves
    lag = [x * 0.6 for x in vagues(2.6, 0.5, 1)]; oiseaux(lag, 11, 7, 1200, 2600, 0.1); ecrire("lagune", lag)
    mer = vagues(5.5, 1.6, 2); oiseaux(mer, 12, 3, 2600, 3400, 0.05); ecrire("mer", mer)
    foret = [x * 0.15 for x in bruit_filtre(N, 0.02, 3)]; oiseaux(foret, 13, 22); grillons(foret, 23, 0.02); ecrire("foret", foret)
    marche = rumeur(4, 0.9); chocs(marche, 14, 18); oiseaux(marche, 24, 3, 2500, 3500, 0.04); ecrire("marche", marche)
    village = add(rumeur(5, 0.25), [x * 0.1 for x in bruit_filtre(N, 0.02, 15)]); oiseaux(village, 25, 9, 2000, 3600, 0.09); chocs(village, 35, 4, 0.08, 900); ecrire("village", village)
    maison = [x * 0.25 for x in brun(N, 6)]; crepitements(maison, 16, 140); ecrire("maison", maison)
    ciel = [x * 0.08 for x in bruit_filtre(N, 0.01, 7)]; grillons(ciel, 17, 0.06); chant(ciel, 3.0, 700, 520, 0.5, 0.06); chant(ciel, 3.7, 700, 520, 0.5, 0.06); ecrire("ciel", ciel)


if __name__ == "__main__":
    main()
