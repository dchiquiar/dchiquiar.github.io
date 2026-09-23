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
      // F-22: mismo texto que data/hobbies.yaml → section.title.en. El nav
      // no tiene acceso a los datos de la sección (SiteNav.astro sólo
      // recibe ids + este diccionario), así que la etiqueta se repite acá
      // a mano — mismo patrón ya existente para el resto de las secciones
      // (p. ej. "education"/"Education" también está en sections.education).
      hobbies: "About me",
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
      // F-20: nombre accesible de la terminal decorativa (data/now.yaml).
      // El comando en sí ("cat now.txt") es sintaxis de shell, no
      // necesariamente legible para quien no la reconoce — este rótulo
      // (chrome de interfaz, no contenido del CV) va en aria-label del
      // contenedor, nunca visible.
      currentlyLearningLabel: "Currently learning",
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
      problemLabel: "Challenges I found",
      screenshotsLabel: "Screenshots",
      viewCode: "View code",
      viewLive: "Live demo",
      noRepoNote: "Code not public",
      // F-19 (ADR-0019 §5): navegación de proyectos con JS mínimo. Nivel 1
      // (cambia de proyecto) y nivel 2 (cambia de captura dentro del
      // proyecto activo) usan etiquetas distintas a propósito, para que un
      // lector de pantalla nunca confunda a cuál de los dos afecta un
      // control. Los "Template" llevan placeholders ({current}/{total}/
      // {title}) que el script inline de ProjectsSection.astro completa en
      // tiempo de ejecución — el script en sí no tiene texto propio en
      // ningún idioma, sólo rellena estas plantillas ya traducidas.
      prevProject: "Previous project",
      nextProject: "Next project",
      counterTemplate: "{current} / {total}",
      announceTemplate: "Project {current} of {total}: {title}",
      slideLabelTemplate: "{current} of {total}",
      prevScreenshot: "Previous screenshot",
      nextScreenshot: "Next screenshot",
      screenshotLabelTemplate: "Screenshot {current} of {total}",
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
    hobbies: {
      // F-22: mismos dos niveles de navegación que "projects" (cambiar de
      // item / cambiar de foto), con sustantivos propios porque estas son
      // fotos personales, no capturas de pantalla — reusar el texto de
      // "projects" ("screenshot") describiría mal el contenido para quien
      // usa lector de pantalla.
      prevItem: "Previous topic",
      nextItem: "Next topic",
      counterTemplate: "{current} / {total}",
      announceTemplate: "{title}: {current} of {total}",
      slideLabelTemplate: "{current} of {total}",
      photosLabel: "Photos",
      prevPhoto: "Previous photo",
      nextPhoto: "Next photo",
      photoLabelTemplate: "Photo {current} of {total}",
    },
    contact: {
      emailCta: "Email me",
      heading: "Let's talk",
    },
    footer: {
      // F-21: única frase del footer, con placeholders literales
      // `{heart}`/`{robot}`/`{coffee}` en el lugar de cada emoji —
      // SiteFooter.astro los separa del texto para envolverlos en su
      // propio `<span aria-hidden>` + alternativa accesible.
      tagline: "Made with {heart}, a bit of {robot} and lots and lots and lots of {coffee}",
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
      hobbies: "Acerca de mí",
      about: "Sobre mí",
      contact: "Contacto",
      sectionsLabel: "Navegación de secciones",
    },
    hero: {
      downloadCv: "Descargar CV (PDF)",
      viewProjects: "Ver proyectos",
      from: "Desde",
      currentlyLearningLabel: "Actualmente estudiando",
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
      prevProject: "Proyecto anterior",
      nextProject: "Proyecto siguiente",
      counterTemplate: "{current} / {total}",
      announceTemplate: "Proyecto {current} de {total}: {title}",
      slideLabelTemplate: "{current} de {total}",
      prevScreenshot: "Captura anterior",
      nextScreenshot: "Captura siguiente",
      screenshotLabelTemplate: "Captura {current} de {total}",
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
    hobbies: {
      prevItem: "Tema anterior",
      nextItem: "Tema siguiente",
      counterTemplate: "{current} / {total}",
      announceTemplate: "{title}: {current} de {total}",
      slideLabelTemplate: "{current} de {total}",
      photosLabel: "Fotos",
      prevPhoto: "Foto anterior",
      nextPhoto: "Foto siguiente",
      photoLabelTemplate: "Foto {current} de {total}",
    },
    contact: {
      emailCta: "Escribime",
      heading: "Hablemos",
    },
    footer: {
      tagline: "Hecho con {heart}, un poco de {robot} y mucho, mucho, mucho {coffee}",
    },
  },
};
