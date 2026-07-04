import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const gdprSk = `# Ochrana osobných údajov (GDPR)

## 1. Prevádzkovateľ

Prevádzkovateľom osobných údajov je prevádzkovateľ strelnice (ďalej len "prevádzkovateľ"). Kontaktná osoba pre ochranu osobných údajov: strelnica@pictusweb.sk

## 2. Aké osobné údaje spracúvame

### 2.1 Registrovaní členovia
- Meno a priezvisko
- E-mailová adresa
- Telefónne číslo
- Dátum narodenia
- Adresa bydliska
- Číslo zbrojného preukazu — uložené v šifrovanej forme (vkladá administrátor pri prvej návšteve)
- Evidencia zbraní (názov, kaliber, sériové číslo) — sériové číslo uložené v šifrovanej forme
- Údaje o členských poplatkoch
- História rezervácií a návštev strelnice

### 2.2 Kontaktný formulár
- Meno, e-mailová adresa, telefónne číslo (voliteľné)
- Text správy
- IP adresa, user-agent prehliadača, čas vyplnenia formulára

### 2.3 Návštevníci webstránky
- Analytické údaje prostredníctvom nástroja Umami (len so súhlasom)
- Technické cookies nevyhnutné pre fungovanie stránky

## 3. Účel spracúvania

- **Plnenie zmluvy**: správa členstva, rezervácie strelnice, evidencia návštev
- **Zákonná povinnosť**: evidencia podľa zákona č. 190/2003 Z.z. o strelných zbraniach, účtovné záznamy podľa zákona č. 431/2002 Z.z.
- **Oprávnený záujem**: bezpečnosť strelnice, prevencia zneužitia, ochrana pred botmi
- **Súhlas**: analytické cookies (Umami), marketingová komunikácia

## 4. Cookies

### Nevyhnutné cookies
- **CookieConsent** — ukladá vašu voľbu ohľadom cookies (365 dní)
- **Session cookie** — udržiava prihlásenie

### Voliteľné analytické cookies
- **Umami** — anonymné meranie návštevnosti. Aktivuje sa len po vašom súhlase. Nepoužívame žiadne marketingové, reklamné ani cookies tretích strán.

## 5. Doba uchovávania údajov

| Údaje | Doba uchovávania | Právny základ |
|---|---|---|
| Členské poplatky a faktúry | 10 rokov | Zákon o účtovníctve |
| Evidencia rezervácií a návštev | 3–5 rokov | Prevádzkový poriadok + zákon o zbraniach |
| Číslo zbrojného preukazu | Trvanie členstva + 3 roky | Minimalizácia GDPR |
| Evidencia zbraní | Trvanie členstva + 3 roky | Zákon o zbraniach |
| Meno, adresa, dátum narodenia | Trvanie členstva + 3 roky | Minimalizácia GDPR |
| Záznamy o udelení súhlasu | Trvanie členstva + 4 roky | Obrana právnych nárokov |
| Kontaktné správy | 1 rok | Minimalizácia |
| Logy notifikácií (e-mail/SMS) | 12 mesiacov | Prevádzka |
| Audit log | 3 roky | Bezpečnosť |
| IP adresy a user-agent | 6 mesiacov | Minimalizácia |

Po uplynutí doby uchovávania sú údaje automaticky anonymizované alebo vymazané.

## 6. Vaše práva

Máte právo na:
- **Prístup** k vašim osobným údajom
- **Opravu** nesprávnych údajov
- **Vymazanie** údajov ("právo byť zabudnutý")
- **Obmedzenie** spracúvania
- **Prenosnosť** údajov (export vo formáte JSON)
- **Odvolanie súhlasu** kedykoľvek
- **Podanie námietky** proti spracúvaniu

Na žiadosti odpovedáme do 48 hodín, v zložitejších prípadoch do 30 dní.

Export vašich údajov je dostupný priamo v profile (sekcia "Exportovať moje údaje").

## 7. Anonymizácia a vymazanie účtu

Ako člen môžete požiadať o anonymizáciu vášho účtu. Po potvrdení administrátorom budú všetky osobné údaje nezvratne nahradené anonymizovanými hodnotami. Rezervácie a účtovné záznamy zostanú zachované v anonymizovanej forme podľa zákonných požiadaviek.

## 8. Bezpečnosť údajov

- Heslá sú uložené pomocou algoritmu Argon2
- Číslo zbrojného preukazu je šifrované (AES-256)
- Sériové čísla zbraní sú šifrované (AES-256)
- Komunikácia prebieha cez HTTPS
- V prípade úniku údajov budete informovaní do 72 hodín

## 9. Hosting a poskytovatelia

Údaje sú uložené na serveroch v EÚ (Hetzner, Coolify).

## 10. Právny rámec

- Nariadenie (EÚ) 2016/679 (GDPR)
- Zákon č. 18/2018 Z.z. o ochrane osobných údajov
- Zákon č. 190/2003 Z.z. o strelných zbraniach a strelive
- Zákon č. 431/2002 Z.z. o účtovníctve

Posledná aktualizácia: 18. apríla 2026`;

const gdprHu = `# Adatvédelmi szabályzat (GDPR)

## 1. Adatkezelő

A személyes adatok kezelője a lőtér üzemeltetője (a továbbiakban "adatkezelő"). Adatvédelmi kapcsolattartó: strelnica@pictusweb.sk

## 2. Milyen személyes adatokat kezelünk

### 2.1 Regisztrált tagok
- Vezetéknév és keresztnév
- E-mail cím
- Telefonszám
- Születési dátum
- Lakcím
- Fegyvertartási engedély száma — titkosítva tárolva (az első látogatáskor az adminisztrátor rögzíti)
- Fegyvernyilvántartás (név, kaliber, gyártási szám) — a gyártási szám titkosítva tárolva
- Tagsági díj adatok
- Foglalási és látogatási előzmények

### 2.2 Kapcsolati űrlap
- Név, e-mail cím, telefonszám (opcionális)
- Üzenet szövege
- IP cím, böngésző user-agent, kitöltési idő

### 2.3 Weboldal látogatók
- Analitikai adatok az Umami eszközzel (csak hozzájárulás esetén)
- A weboldal működéséhez szükséges technikai sütik

## 3. Az adatkezelés célja

- **Szerződés teljesítése**: tagság kezelése, lőtér foglalása, látogatások nyilvántartása
- **Jogi kötelezettség**: nyilvántartás a 190/2003 sz. törvény szerint, számviteli nyilvántartások
- **Jogos érdek**: lőtér biztonsága, visszaélés megelőzése, bot-védelem
- **Hozzájárulás**: analitikai sütik (Umami), marketing kommunikáció

## 4. Sütik (Cookie-k)

### Szükséges sütik
- **CookieConsent** — tárolja az Ön süti-választását (365 nap)
- **Munkamenet süti** — fenntartja a bejelentkezést

### Opcionális analitikai sütik
- **Umami** — anonim látogatottsági mérés. Csak az Ön hozzájárulásával aktiválódik. Nem használunk marketing, reklám vagy harmadik féltől származó sütiket.

## 5. Adatmegőrzési idő

| Adatok | Megőrzési idő | Jogalap |
|---|---|---|
| Tagsági díjak és számlák | 10 év | Számviteli törvény |
| Foglalási és látogatási nyilvántartás | 3–5 év | Üzemeltetési szabályzat + fegyvertörvény |
| Fegyvertartási engedély száma | Tagság időtartama + 3 év | GDPR minimalizálás |
| Fegyvernyilvántartás | Tagság időtartama + 3 év | Fegyvertörvény |
| Név, cím, születési dátum | Tagság időtartama + 3 év | GDPR minimalizálás |
| Hozzájárulási nyilvántartások | Tagság időtartama + 4 év | Jogos igények védelme |
| Kapcsolati üzenetek | 1 év | Minimalizálás |
| Értesítési naplók (e-mail/SMS) | 12 hónap | Működtetés |
| Audit napló | 3 év | Biztonság |
| IP címek és user-agent | 6 hónap | Minimalizálás |

A megőrzési idő lejárta után az adatokat automatikusan anonimizáljuk vagy töröljük.

## 6. Az Ön jogai

Önnek joga van:
- Személyes adataihoz **hozzáférni**
- Helytelen adatait **kijavíttatni**
- Adatai **törlését** kérni ("az elfeledtetéshez való jog")
- Az adatkezelés **korlátozását** kérni
- Adatai **hordozhatóságát** kérni (JSON formátumú export)
- **Hozzájárulását** bármikor visszavonni
- **Tiltakozni** az adatkezelés ellen

A kérelmekre 48 órán belül válaszolunk, bonyolultabb esetekben 30 napon belül.

Az adatok exportja közvetlenül a profiljában érhető el ("Adataim exportálása" szekció).

## 7. Anonimizálás és fiók törlése

Tagként kérheti fiókja anonimizálását. Az adminisztrátor jóváhagyása után minden személyes adat visszavonhatatlanul anonimizált értékekre cserélődik. A foglalások és számviteli nyilvántartások a törvényi előírásoknak megfelelően anonimizált formában megmaradnak.

## 8. Adatbiztonság

- A jelszavakat Argon2 algoritmussal tároljuk
- A fegyvertartási engedély száma titkosítva tárolódik (AES-256)
- A fegyverek gyártási számai titkosítottak (AES-256)
- A kommunikáció HTTPS-en keresztül történik
- Adatszivárgás esetén 72 órán belül értesítjük

## 9. Tárhely és szolgáltatók

Az adatokat EU-beli szervereken tároljuk (Hetzner, Coolify).

## 10. Jogi keret

- (EU) 2016/679 rendelet (GDPR)
- 18/2018 sz. törvény a személyes adatok védelméről
- 190/2003 sz. törvény a lőfegyverekről és lőszerekről
- 431/2002 sz. törvény a számvitelről

Utolsó frissítés: 2026. április 18.`;

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const docs = [
    { kind: "gdpr" as const, version: "v1", locale: "sk" as const, contentMd: gdprSk },
    { kind: "gdpr" as const, version: "v1", locale: "hu" as const, contentMd: gdprHu },
  ];

  for (const doc of docs) {
    await db
      .insert(schema.consentDocuments)
      .values({
        ...doc,
        publishedAt: new Date(),
        publishedBy: (await db.select({ id: schema.users.id }).from(schema.users).limit(1))[0].id,
      })
      .onConflictDoNothing();
    console.log(`Seeded ${doc.kind} ${doc.locale} ${doc.version}`);
  }

  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
