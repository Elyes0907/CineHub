import jwt from "jsonwebtoken";

// Middleware checkToken : vérifie le token JWT envoyé dans le header
//   Authorization: Bearer <token>
export function checkToken(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  // Pas de token (ou mauvais format) → 401
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Token falsifié, modifié ou expiré → 403
    return res.status(403).json({ error: "Token incorrect" });
  }

  // Token valide : on garde les infos de l'utilisateur pour la suite (controllers, checkAdmin)
  req.user = user;
  next();
}
