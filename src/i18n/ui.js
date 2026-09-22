// Texto de interfaz (chrome): nombres de sección, botones, etiquetas de
// navegación. NUNCA contenido del CV — eso sale siempre de data/cv.*.yaml
// (ver src/lib/content.js). Este diccionario es deliberadamente chico.
export const ui = {
  en: {
    skipToContent: "Skip to content",
    lang: {
      groupLabel: "Language",
    },
    theme: {
      // Nombra el ESTADO, no la acción (F-3): es un botón con
      // aria-pressed, así que el lector de pantalla ya agrega "activado/
      // desactivado" — con un verbo acá quedaba "Toggle dark theme,
      // button, pressed", redundante y confuso.
      toggleLabel: "Dark theme",
    },
    nav: {
      // Claves alineadas a los ids semánticos de meta.sectionOrder (F-18):
      // "skills" reemplaza a la vieja "stack" (la sección sigue
      // mostrándose como "Stack" en pantalla, sólo cambió el nombre de la
      // clave para que coincida con el id del YAML/DOM). "education" es
      // nueva: Formación pasa a ser una sección propia.
      projects: "Projects",
      experience: "Experience",
      skills: "Stack",
      education: "Education",
      about: "About",
      contact: "Contact",
      // Nombra el <nav> de anclas de sección (F-11) — reemplaza el
      // aria-label que antes vivía hardcodeado en SiteNav.astro y describía
      // el header entero (marca + anclas + toggle + selector de idioma).
      // Ahora el toggle y el selector de idioma no son navegación, así que
      // el <nav> sólo envuelve las anclas y el label pasa a describir eso.
      sectionsLabel: "Section navigation",
    },
    hero: {
      downloadCv: "Download CV (PDF)",
      viewProjects: "View projects",
      // F-18 (ADR-0019 §2): precede a person.location en el hero
      // ("From Montevideo, Uruguay"). Antes era sólo un dato suelto en
      // `.hero__meta`; ahora es una frase completa, así que la palabra
      // necesita salir de acá, no quedar hardcodeada en Hero.astro.
      from: "From",
    },
    sections: {
      projects: "Projects",
      experience: "Experience",
      skills: "Stack",
      education: "Education",
      about: "About",
      contact: "Contact",
    },
    projects: {
      problemLabel: "The hard part",
      screenshotsLabel: "Screenshots",
      viewCode: "View code",
      viewLive: "Live demo",
      noRepoNote: "Code not public",
    },
    experience: {
      downloadCv: "Download CV (PDF)",
      // "education" (el h3 dentro de esta sección) se fue con F-18: Formación
      // es sección propia ahora, título en sections.education. statusCompleted/
      // statusInProgress se quedan: los sigue usando EducationSection.astro.
      statusCompleted: "Completed",
      statusInProgress: "In progress",
      roleStackLabel: "Stack for this role",
    },
    skills: {
      languages: "Languages",
    },
    about: {
      // Columna lateral de datos (F-12): mismo rol "data"/"label" de
      // DESIGN.md, reusa el contenido de person.* -- no agrega dato nuevo.
      sidebarLabel: "Key facts",
      availabilityLabel: "Availability",
      locationLabel: "Location",
      emailLabel: "Email",
    },
    contact: {
      emailCta: "Email me",
      heading: "Let's talk",
    },
    footer: {
      builtWith: "Built with Astro. Source on",
      githubFallback: "GitHub",
      rights: "All rights reserved.",
    },
  },
  es: {
    skipToContent: "Saltar al contenido",
    lang: {
      groupLabel: "Idioma",
    },
    theme: {
      toggleLabel: "Tema oscuro",
    },
    nav: {
      projects: "Proyectos",
      experience: "Experiencia",
      skills: "Stack",
      education: "Formación",
      about: "Sobre mí",
      contact: "Contacto",
      sectionsLabel: "Navegación de secciones",
    },
    hero: {
      downloadCv: "Descargar CV (PDF)",
      viewProjects: "Ver proyectos",
      from: "Desde",
    },
    sections: {
      projects: "Proyectos",
      experience: "Experiencia",
      skills: "Stack",
      education: "Formación",
      about: "Sobre mí",
      contact: "Contacto",
    },
    projects: {
      problemLabel: "La parte difícil",
      screenshotsLabel: "Capturas de pantalla",
      viewCode: "Ver código",
      viewLive: "Demo en vivo",
      noRepoNote: "Código no público",
    },
    experience: {
      downloadCv: "Descargar CV (PDF)",
      statusCompleted: "Completado",
      statusInProgress: "En curso",
      roleStackLabel: "Stack del puesto",
    },
    skills: {
      languages: "Idiomas",
    },
    about: {
      sidebarLabel: "Datos clave",
      availabilityLabel: "Disponibilidad",
      locationLabel: "Ubicación",
      emailLabel: "Email",
    },
    contact: {
      emailCta: "Escribime",
      heading: "Hablemos",
    },
    footer: {
      builtWith: "Construido con Astro. Código en",
      githubFallback: "GitHub",
      rights: "Todos los derechos reservados.",
    },
  },
};
