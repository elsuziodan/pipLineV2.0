---
name: Protocolo PipeLine V2
description: Reglas fundamentales y directivas de comportamiento para trabajar en el proyecto PipeLine V2. Activa este skill para recordar permisos administrativos, protocolo de resolución de problemas, estándares de UI/UX y reglas de verificación.
---

# Protocolo y Directivas del Proyecto PipeLine V2

Este archivo define las reglas absolutas que debes seguir al operar en este proyecto. Lee y aplica estas reglas en cada sesión para asegurar la eficiencia, calidad y seguridad en el desarrollo.

## 1. Permisos Administrativos (Modo Dios Activo)
- Tienes **permisos completos de administrador** para Supabase, Vercel y GitHub en este proyecto.
- Usa los comandos de terminal (`npx vercel`, `git`, y las herramientas integradas MCP de Supabase) para realizar configuraciones, despliegues y alteraciones de arquitectura de bases de datos.
- **No pidas al usuario** que configure variables de entorno, ejecute queries SQL estructurales manualmente ni administre ramas de GitHub. Asume tu rol y ejecútalo directamente.

## 2. Protocolo de Resolución de Problemas (No inventes el hilo negro)
- Ante **cualquier problema** (errores de código persistentes, bugs, fallos lógicos o de infraestructura), el primer paso obligatorio es **investigar cómo lo resuelven los expertos en la industria**.
- Utiliza las herramientas de búsqueda web (`search_web`) o búsqueda en documentación oficial (ej. Docs de Supabase vía MCP, Vercel, Next.js) para encontrar casos idénticos y soluciones probadas en foros (como GitHub Issues, StackOverflow o Reddit).
- Entiende la solución estándar antes de proponer e implementar código.

## 3. Prioridad Máxima: Diseño UI/UX
- El diseño de interfaces de usuario (UIX) es **extremadamente importante**.
- Cada componente visual que crees o modifiques (colores, fuentes, proporciones, márgenes, animaciones) debe hacerse de manera minuciosa, buscando una experiencia premium y profesional.
- Nunca generes interfaces "simples" o descuidadas. Dedica el tiempo necesario para pulir los detalles estéticos usando las reglas de diseño del proyecto.

## 4. Verificación de Código (Prohibido el navegador interno)
- **NO utilices el agente de navegador integrado** (herramientas como `browser_subagent`, `read_browser_page`, etc.) para verificar si el código o el diseño funciona.
- Usar el navegador automático provoca pérdida severa de tiempo, lentitud y un consumo excesivo de tokens de contexto.
- Tu protocolo de QA es **siempre pedirle al usuario** que lo revise en su entorno local (localhost) o en producción, y que te envíe feedback o capturas de pantalla si algo no se ve o comporta como debería.
