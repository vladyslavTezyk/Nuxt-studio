import '../../../preview-app/src/custom-element.main'
import styles from '../../../preview-app/src/assets/css/main.css?inline'


export function mountPreviewUI() {
  const el = document.createElement('preview-app')
  el.id = '__nuxt_preview_wrapper'
  document.body.appendChild(el)

  const style = document.createElement('style')
  style.textContent = styles
  el.shadowRoot?.appendChild(style)
}
