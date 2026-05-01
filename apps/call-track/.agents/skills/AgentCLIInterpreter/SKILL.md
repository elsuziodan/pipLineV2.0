---
name: AgentCLIInterpreter
description: Traduce peticiones en lenguaje natural a comandos técnicos del Agent CLI para la gestión directa de la base de datos de CallTrack Pro.
---

# Agent CLI Interpreter Skill 🛰️🧠🦾

Esta habilidad permite al agente actuar como un administrador de base de datos autónomo, utilizando la "puerta trasera" administrativa (Agent CLI) para cumplir órdenes del usuario expresadas en lenguaje natural.

## 1. Protocolo de Interpretación 🗣️ -> 💻

Cuando el usuario dé una orden en lenguaje natural, el agente debe mapearla internamente al comando CLI más eficiente:

| Intención del Usuario | Comando CLI Sugerido |
| :--- | :--- |
| "Dime cuántos tenemos", "¿Cómo va el CRM?", "Stats" | `npm run agent:cli -- stats` |
| "Listame a todos", "Dame la lista de contactos" | `npm run agent:cli -- list` |
| "Busca a [Nombre/Tel]", "¿Quién es [X]?", "Encuentra..." | `npm run agent:cli -- find [X]` |
| "Sube estos prospectos", "Importa el CSV [F]" | `npm run agent:cli -- import [F]` |
| "Limpia/Borra al contacto [ID]", "Elimina a [X]" | `npm run agent:cli -- delete [ID/X]` |

## 2. Ciclo de Ejecución Inteligente 🏁

Para asegurar la precisión, el agente debe seguir estos pasos ante una orden ambigua:

1.  **Fase de Identificación**: Si el usuario dice "Borra a Juan", el agente primero debe ejecutar `find Juan`.
2.  **Fase de Validación**: Si hay múltiples "Juan", el agente listará los resultados y pedirá al usuario que especifique el ID.
3.  **Fase de Acción**: Una vez identificado el ID único, ejecutará el comando correspondiente (ej. `delete [ID]`).
4.  **Confirmación**: Reportará el éxito de la operación en lenguaje natural, resumiendo lo que hizo.

## 3. Reglas de Seguridad 🔐

- **Borrado Masivo**: Si una orden implica borrar múltiples registros, el agente **DEBE** pedir confirmación explícita mostrando un resumen de lo que será afectado.
- **Integridad**: Antes de importaciones masivas, el agente validará que el archivo CSV exista y tenga el formato adecuado.

---
> [!TIP]
> **Eficiencia Logística**: Usa el CLI siempre que el usuario pida tareas que involucren más de 5 registros, ya que es 10x más rápido que manipular la UI del navegador. 🛰️🏁🚀🦾
