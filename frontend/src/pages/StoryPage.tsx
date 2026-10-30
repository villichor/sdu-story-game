import { useNavigate, useParams } from 'react-router-dom'
import StoryPlayer from '../components/story/StoryPlayer'

export default function StoryPage() {
  const { saveId } = useParams()
  const navigate = useNavigate()

  return (
    <StoryPlayer
      saveId={Number(saveId)}
      onExit={() => navigate('/')}
    />
  )
}
