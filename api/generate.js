export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed: POST 요청만 지원합니다.' });
    }

    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    // Vercel 환경 변수에서 키 읽기 (코드 내 하드코딩 금지)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
    }

    // AI에게 전달할 프롬프트
    const promptText = `
        첨부된 음식 사진을 분석하여 다음 항목들을 정리해줘:
        1. 음식 이름과 추정 칼로리
        2. 주요 영양소 (탄수화물, 단백질, 지방, 비타민 등) 분석
        3. 현재 식단에서 부족한 칼로리 및 영양소
        4. 부족한 영양소를 채워주기 위해 함께 곁들여 먹으면 좋은 추천 음식 2~3가지
        
        전문 영양사가 조언하듯 친절한 말투로, 가독성 좋게 줄바꿈과 기호를 활용해서 답변해줘.
    `;

    try {
        // 별도의 라이브러리 설치 없이 기본 fetch를 사용하여 Vercel 호환성 극대화
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: imageBase64
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Gemini API 호출 에러');
        }

        // AI의 텍스트 응답 추출
        const resultText = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ result: resultText });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    }
}