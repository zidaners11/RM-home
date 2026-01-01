# ---------- ETAPA DE BUILD ----------
FROM node:20-slim AS build

WORKDIR /app

# Copiamos package.json e instalamos dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del proyecto y hacemos build
COPY . .
RUN npm run build

# ---------- ETAPA DE PRODUCCIÓN ----------
FROM nginx:alpine

# Copiamos los archivos estáticos generados por Vite
COPY --from=build /app/dist /usr/share/nginx/html

# Copiamos configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponemos el puerto que queremos usar
EXPOSE 100

CMD ["nginx", "-g", "daemon off;"]
