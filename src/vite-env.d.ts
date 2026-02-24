// CSS Modules types
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

// Vue 3 CSS Modules support - augmentation
export {}

declare module 'vue' {
  interface ComponentCustomProperties {
    $style: Record<string, string>
  }
}
