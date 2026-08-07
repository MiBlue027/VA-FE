import type {N8nAgentReq, N8nAgentRes} from "../dto/N8nDto.ts";
import Http from "../../../miblue/helper/HttpHelper.ts";

export interface AgenticService_Config {
    webhookUrl: string
}

export class AgenticService {
    private config: AgenticService_Config

    public constructor(config: AgenticService_Config) {
        this.config = config
    }

    async AskQuestion(question: string, usersId: number){
        const request: N8nAgentReq = {
            question: question
            , usersId: usersId
        }

        const response: N8nAgentRes = await Http.post<any>(this.config.webhookUrl, "", request);

        if (response?.answer != null){
            return response.answer
        }

        throw new Error("Failed to get response from agent");
    }
}