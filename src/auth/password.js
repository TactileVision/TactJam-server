import securePassword from "secure-password";

// initialized password policy
const pwd = securePassword();

async function compareHash(candidatePassword, hash, hashEncoding = "hex") {
  // check encoding, default is hex, since its saved in hex in the database
  const encoding = ["utf8", "hex"];
  hashEncoding = encoding.includes(hashEncoding) ? hashEncoding : "hex";

  // create buffer from the possible password and the provided hash
  const userPasswordBuffer = Buffer.from(candidatePassword);
  const hashBuffer = Buffer.from(hash, hashEncoding);

  const result = await pwd.verify(userPasswordBuffer, hashBuffer);

  switch (result) {
    case securePassword.INVALID_UNRECOGNIZED_HASH: {
      // Hash is not valid or it was not made with secure-password
      return { valid: false, msg: "Hash is invalid" };
    }
    case securePassword.INVALID: {
      // Invalid password
      return { valid: false, msg: "Invalid password" };
    }
    case securePassword.VALID: {
      // Authenticated
      return { valid: true };
    }

    case securePassword.VALID_NEEDS_REHASH: {
      // improve safety
      const improvedHash = await pwd.hash(userPasswordBuffer);
      return { valid: true, newHash: improvedHash };
    }
    default:
      return { valid: false, msg: "Something went wrong" };
  }
}

async function generateHash(password) {
  const userPassword = Buffer.from(password);
  const hash = await pwd.hash(userPassword);
  return hash;
}

export { compareHash, generateHash };
