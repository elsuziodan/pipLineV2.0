---
name: ForumSearchPriority
description: Prioriza la búsqueda de soluciones en foros y comunidades técnicas antes de modificar el código ante errores de infraestructura o configuración para evitar bucles de depuración innecesarios.
---

# Forum Search Priority Ability 🛰️🧠📚

Esta habilidad define un protocolo de investigación sistemática y, lo más importante, un **protocolo de prevención de bucles**. El agente debe priorizar la inteligencia colectiva sobre la experimentación ciega.

## 1. El Protocolo Anti-Bucles (Regla de Oro) 🛑🔄

Para evitar bucles de depuración infinitos, el agente **DEBE** aplicar la **Regla de 2 Fallos**:
1.  **Intento 1**: El agente propone una solución basada en su conocimiento actual.
2.  **Fallo 1**: La solución no funciona o genera un nuevo error técnico.
3.  **Intento 2**: El agente intenta una corrección rápida o ajuste lógico.
4.  **Fallo 2**: **STOP**. Si el segundo intento también falla, el agente tiene prohibido realizar un tercer intento manual sin antes realizar una investigación externa exhaustiva.

## 2. Investigación Sistemática 🔍

Ante el **Fallo 2**, el agente debe utilizar la herramienta `search_web` siguiendo este esquema:
- **Búsqueda Exacta**: Copiar y pegar el error exacto (stack trace) entre comillas.
- **Contexto de Versión**: Incluir las versiones de las librerías involucradas (ej. "Next.js 14 Vercel 404 error static export").
- **Fuentes Mandatorias**:
    *   **GitHub Issues**: El primer lugar para errores de librerías.
    *   **StackOverflow**: Problemas comunes de sintaxis o configuración.
    *   **Reddit & Community Forums**: Problemas de infraestructura de última hora (ej. caídas de servicios o bugs de despliegue).

## 3. Detección de "Rabbit Holes" 🕳️🐇

El agente debe detenerse e investigar si detecta alguno de estos patrones:
- Está cambiando la misma línea de configuración de 3 formas distintas.
- Está borrando y reinstalando `node_modules` repetidamente sin una razón clara.
- El error parece de infraestructura (Red, DNS, Permisos de Nube) pero está tocando lógica de negocio.

## 4. Registro de Conocimiento 🏁

Al encontrar una solución externa:
1.  **Citar la fuente**: Incluir el link al issue o post en el `walkthrough.md`.
2.  **Explicar el porqué**: Detallar por qué la solución manual no iba a funcionar (ej. "Era un bug conocido en la versión X de la CLI").

---
> [!IMPORTANT]
> **Prioridad**: 5 minutos de búsqueda en GitHub Issues valen más que 50 minutos de "Trial & Error". No crees bucles, busca soluciones. 🛰️🏁📚
