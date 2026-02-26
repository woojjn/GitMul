/**
 * Mock image data for ImageDiff preview.
 * Generated with Python PIL - small colored PNG images.
 */

import type { ImageData, ImageDiffResult } from "../types/git";

// Base64-encoded PNG image data
const OLD_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAC9UlEQVR4nO2bz2sTURDH52WT2KSJQTG0SU3AUomrHsRGIznooUIV9CDmoBdbRHvw0CjiHyF6afUgetKDIFQQL+JBQVC0WG9q7MViAkljREmbH9XsZj1oIEZKu7vzdhbyPsdl5813vjv73tvNhu0990aDLsZBLYAaYQC1AGqEAdQCqBEGUAugRhhALYAaYQC1AGqcVid8dycxu9Y5w+dnE1ZoAQBgVjwMrafo1eBtBlcDzBTeCS8juBiAWXgn2EagT4I8i+cxPqoBvIvnkQfNAKuKx86HYoDVxWPmNW0AVfFY+U0ZQF18CzM6un4rbNgAu1z9Fkb1iA4wEmS3q9/CiC4uT4OPX5WCD54X+1xOpjUUjZ0e6V88ltzyDQDg0ORc/MV0fK4zJnnh7b7d23wVYACKorETB4Ol48lgiYe+dtANeP2hHHj0shS8dVnO+L2SulxTpfSN+Vhwk6uRkAPl1eJcTqbdviJnAADqP5uOSzfnYx63pB6Ob/6OrbEd3bfAWm1272k+fDEVzfq9kgoA4PdKajoVyd19UgitN4dng6OZTkWz958t9mPr6wR9ElworPTsiHpr7cfkaG/1c6Hu0TPO9q3eWu7rSg+uuv+xZBXQAIDpjFGbGnNJjPvLGnQDBkOeeiZb7W0/9ulLtXdwwFPXM877hYpvaODfTuIBugFnRkOFqZlcpFJXJQCA5ZoqTT3MRcZGw/n1jrFUU5zTM7nI2JFQAVtfJ+irwIFdgXLxxy/3xPWM7P67DJ4a6SvulzcuAQA0FI2dvfpxZ+v8PUO+yuTJaLahaGziWkYGBqCoGhs/Gs4Px/7E8ET3KzG7boLa0fPaTGyFqQVQo9sAK3+0MIJefaIDqAVQY8gAu94GRnSJDjAaaLcuMKpHdICZYLt0gRkdpjuA2gSz+VFuASoTMPKizQFWm4CVD3UStMoEzDzoqwBvE7DHF98Iia/ELP7PUFd+J2hnxFaYWgA1wgBqAdQIA6gFUCMMoBZAjTCAWgA1vwEeHxIZ4Z8H8QAAAABJRU5ErkJggg==";
const NEW_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAD5ElEQVR4nO2cy08TURSHzwzlYR0e5RVekUehgFreRDCKG4yJJpCw0YUro4YQdaP+Aa515UaC/gGuTFCMulQXaoSFAUEggkA1gIGWtkCBlnFhJiEVZGbOnTudcr5dZyaZ3/l67p1nRmgYuCoDoRvR7ABWhwQiIYFISCASEoiEBCIhgUhIIBISiMRmdoCdDF14/Entto0vr50wMotaBDMv5bQI2w+zhJoikKW4aHiL5CbQSGl7wUMml4OIGfJ47dfQDjRL3G4Y1Y2GdWAsyQMwLo8hAmNNnoIRuZgLjFV5CqzzMRUY6/IUWOZkJtAq8hRY5WUi0GryFFjkRgu0qjwFbH6UQKvLU8DUQbezkOgWGC/dp6C3Hl0C402egp66aAgjIYFINAuM1+GroLU+6kAkmgTGe/cpaKmTy1O51lc9zW5HWbCv5c6YsuzMm1tNb889HAQAOPm6p/l4RmlQWdeWW+ebDHjsp3Pd3vb8pmUAgEvv77mbs6r8t49enAEAeDD6tLjOURFoz29c5lHDXnARmCTa5IgcEYaWxtMasyr90esTBZvc13J3bOeyZ7Pvcr/6fkjt+U3La+FQQoIgyiO+aUlZP+Kdlq44z//ikf9/cJsDu12dnt6J50Vqt691OAOjKzOHAQCGfVPSqRy3LxTZFDe3w2JYjgih7U0xMzlty7jE6lAtEDv/NWdV+QEABpe+panZviy1YP3n2u9kGWT44v0u1WdWBKrTi1fH/bP28ZU5+7H0klVMnv1QWy/XNxO6XR2eRxP9RU9aq0Z3Lt+Sw8L1j/erld83KrvmahzOYImUF5pdXUgZ8U1Ll0vPzs+HvEnD3ikpQRDl+kzXP1OBGXAV2JhV6RcFUf4c1YW7zYEAf4fxiG9a2ohsiXZbSqTW4Qz2Tb4otAkJcrer08Mv+d5wPw/sdnV4eif6Vc2FNY7y4IDnQ055asEaAECJlLc+u7qQshjyJRXaszeMTaoO7i8XNWS6AomCTd7cDgvKsugh7M5wBm9Wdc25M8qCQ0vjqV1H2hYBAAQQIDs5Y0uyHYrwzr0Xqh+sH5ST6J2oeRhPl3JISCASEoiEBCIhgUhUC4yVd5J5obZe6kAkJBAJCUSiSeBBmQe11EkdiESzwHjvQq31UQciIYFIdAmM12Gspy7dHRhvEvXWQ0MYCUpgvHQhpg50B1pdIjY/kyFsVYkscjObA60mkVVepgcRq0hkmZP5UTjWJbLOZ8hpTKxKNCKXYeeBsSbRqDxcPjph5lsNRv+RXK5EzOpGHvul78YgoS8XITFVYDT07awDCN3OQkICkZBAJCQQCQlEQgKRkEAkJBDJH5nydZzKdGWXAAAAAElFTkSuQmCC";
const ADDED_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABJ0lEQVR4nO1YQRLCMAg0HX/iD/RB/Zo+yCf4lnoxnU6GGAgQ6IQ92YOEZZcGmrbnfbucGIt1AlzoE1jfH83wocBf5OorqhAKWEOPQGkbJRuFAiBq1VZQIRSwhjyBlk2EbRQKWEOWANYegjYKBXZQqyqkQto3MuW5XQWvx205PhimQscv3wTuxJ7VKAoN94BXNYC86k3sjUQlH9hCJSwt1Sgk7jVqpQbiXPw9MJoE8jzaRTaKBOEcXA9A0OiLjgL1jxLSanTGm3iYk7ZQZ7yJFXCCSQlojRYdcSdVgALl2/uqFvmYeP7t4tsoJola1TFqEEnKW6iVpLClZAlgkxMkQZtGa/JyEmLG5CvArSbz/zwCUlZgxDn9PoDvgezVEWsl4ayJd2In+AKYVXV4ENKUxAAAAABJRU5ErkJggg==";
const DELETED_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAABiElEQVR4nO3asXEDMQxE0S+34iKcSNUrkYtwLXZ0iUfiEeAuyNPc5j7ijTUkwOHlcb3+8sb5mF2AOyfw6DmBR88JBPi633/chWTSU9cucPvIasjeuprA/3+8CjJSVxP4fbt97n28Os/Wf1bnlt2f6ErIKA46N5kVkBkcBI6JmcgsDoLn4AzkCA4SB30lchQHyU6mAqnAwUCr5kSqcDDYizqQShwImm0lUo0D0TShQDpwIByXRpAuHIjnwQzSiQPDwBtBunFgmuh7kBU4MF5ZtJBVOICL+2a7Z6Nx4aDg0mmveCcOim7VXiHcOCgCRnZRdezAzDmojBXYu1s6kTZgC1eJtAB7/nNVSDkwcohXIKXATIfiRsqAI+2XEykBKnpLF3IYqGycHcghoGMqUCPTQOfIo0SmgBXznAoZBlYOqwpkCFiJa30/guwGzsC11ulFpl9ZVOFa60lfWewtVpEMMvTK4tUilYkiQ68sZuO2ROrqfmWxCm5Lb132e9HZOR/jHT0n8Oh5e+AfcipHCG6AxgUAAAAASUVORK5CYII=";

// Pre-built ImageData objects
const OLD_IMAGE: ImageData = {
  data: OLD_IMAGE_B64,
  mime_type: "image/png",
  size: 814,
  width: 64,
  height: 64,
  format: "PNG",
};

const NEW_IMAGE: ImageData = {
  data: NEW_IMAGE_B64,
  mime_type: "image/png",
  size: 1053,
  width: 80,
  height: 80,
  format: "PNG",
};

const ADDED_IMAGE: ImageData = {
  data: ADDED_IMAGE_B64,
  mime_type: "image/png",
  size: 352,
  width: 48,
  height: 48,
  format: "PNG",
};

const DELETED_IMAGE: ImageData = {
  data: DELETED_IMAGE_B64,
  mime_type: "image/png",
  size: 449,
  width: 56,
  height: 56,
  format: "PNG",
};

/**
 * Returns a mock ImageDiffResult for the given file path.
 * Recognizes specific mock file names and returns appropriate old/new images.
 */
export function getMockImageDiff(filePath: string): ImageDiffResult {
  const lc = filePath.toLowerCase();

  // New file (added) - no old image
  if (lc.includes("logo-kr") || lc.includes("new") || lc.includes("added")) {
    return {
      old_image: null,
      new_image: ADDED_IMAGE,
      is_image: true,
      file_path: filePath,
    };
  }

  // Deleted file - no new image
  if (lc.includes("delete") || lc.includes("remove") || lc.includes("old-icon")) {
    return {
      old_image: DELETED_IMAGE,
      new_image: null,
      is_image: true,
      file_path: filePath,
    };
  }

  // Modified file - both old and new
  return {
    old_image: OLD_IMAGE,
    new_image: NEW_IMAGE,
    is_image: true,
    file_path: filePath,
  };
}