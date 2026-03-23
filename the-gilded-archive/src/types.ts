export interface Character {
  name: string;
  title: string;
  portraitUrl: string;
  description: string;
  lore: string;
  attributes: {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
  };
}

export const ELARA_CHARACTER: Character = {
  name: "Elara of the Silver Wood",
  title: "Archival Guardian",
  portraitUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3O1uY-b6HzlLYiQTWCP-ERS7nVlb9u_IOVJy2S2nzxKLOUJ0PwXc0_gg9AlgxJs9-IRLKqDyEZ8qE-4TyVfjQPDMV4pu83y1uOYgjRd_xToyBKUsFIsmpN7zb6j6_6Cgz7JweEPhkzWO2EOmOaUxO0aEkkatNhkkQEExGXoaGn0r3E_OA6i3z2Z09faD--gGLzotk-ytdxB2kMC2tkb73bzUH9UdXm8XrTs5smqy_LNvwky-m_E_J9u71ouAMPyqMKP8fSkr95Khi",
  description: "A high-born elf of the Silver Wood, Elara serves as the primary protector of the ancient archives. Her armor, forged from enchanted silver wood, hums with the whispers of a thousand years of forgotten history.",
  lore: "The trees do not speak in words, but in the rustle of silver leaves. Elara hears the library of the forest, every secret written in sap and root.",
  attributes: {
    STR: 14,
    DEX: 18,
    CON: 12,
    INT: 16,
    WIS: 10,
    CHA: 15
  }
};
