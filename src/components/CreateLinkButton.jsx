import { useNavigate } from 'react-router-dom'
import { Link } from 'quickit-ui'

export default function CreateLinkButton({ children }) {
  const navigate = useNavigate()

  return (
    <Link
      href="/"
      appearance="button"
      variant="solid"
      color="neutral"
      onClick={(event) => {
        event.preventDefault()
        navigate('/')
      }}
    >
      {children}
    </Link>
  )
}
