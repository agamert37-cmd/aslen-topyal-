export async function registerBiometric(username: string): Promise<string> {
  if (!window.PublicKeyCredential) {
    throw new Error('Tarayıcınız biyometrik doğrulamayı desteklemiyor.');
  }

  const userId = Uint8Array.from(username, c => c.charCodeAt(0));
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "İşleyen Et Erp",
      id: window.location.hostname
    },
    user: {
      id: userId,
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },
      { alg: -257, type: "public-key" }
    ],
    timeout: 60000,
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required"
    }
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Biyometrik kayıt iptal edildi.');
  }

  // Convert rawId to base64 to store in DB
  const rawId = Array.from(new Uint8Array(credential.rawId))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return rawId;
}

export async function loginWithBiometric(rawIdHex: string): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    throw new Error('Tarayıcınız biyometrik doğrulamayı desteklemiyor.');
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  // Convert hex string back to Uint8Array
  const rawIdBytes = new Uint8Array(rawIdHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    allowCredentials: [{
      id: rawIdBytes,
      type: 'public-key',
      transports: ['internal']
    }],
    userVerification: 'required',
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  }) as PublicKeyCredential;

  if (assertion) {
    return true;
  }
  
  return false;
}
